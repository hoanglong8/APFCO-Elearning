import { GoogleGenAI, Type } from "@google/genai";
import type { RubricItem, QuizQuestion } from "@/types/database.types";

const MODEL = "gemini-2.5-flash";

export interface AIGradingInput {
  assignmentTitle: string;
  assignmentDescription: string | null;
  maxScore: number;
  rubric: RubricItem[];
  quizQuestions: QuizQuestion[];
  quizAnswers: number[] | null;
  content: string | null;
  promptUsed: string | null;
  aiOutput: string | null;
  reflection: string | null;
  hasAttachment: boolean;
}

export interface AIGradingResult {
  success: boolean;
  totalScore?: number;
  feedback?: string;
  // Song song với input.rubric theo đúng thứ tự — rỗng nếu bài không có rubric.
  rubricScores?: number[];
  error?: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    total_score: {
      type: Type.INTEGER,
      description: "Tổng điểm đề xuất, số nguyên từ 0 đến điểm tối đa của bài tập.",
    },
    rubric_scores: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description:
        "Điểm cho từng tiêu chí rubric, đúng theo thứ tự đã cho trong đề bài. Để mảng rỗng nếu bài không chấm theo rubric.",
    },
    feedback: {
      type: Type.STRING,
      description: "Nhận xét chi tiết bằng tiếng Việt cho học viên: điểm mạnh, điểm cần cải thiện.",
    },
  },
  required: ["total_score", "feedback"],
};

function buildPrompt(input: AIGradingInput): string {
  const sections: string[] = [
    `Bạn là trợ giảng chấm bài cho khóa đào tạo kỹ năng AI nội bộ của công ty.`,
    `Hãy chấm điểm bài nộp sau đây một cách công bằng, nghiêm túc và nhất quán.`,
    ``,
    `## Đề bài: ${input.assignmentTitle}`,
    input.assignmentDescription ? `Mô tả/yêu cầu: ${input.assignmentDescription}` : "",
    `Điểm tối đa: ${input.maxScore}`,
  ];

  if (input.rubric.length > 0) {
    sections.push(
      ``,
      `## Tiêu chí chấm (rubric) — hãy chấm điểm cho TỪNG tiêu chí theo đúng thứ tự dưới đây, tổng không vượt quá điểm tối đa mỗi tiêu chí:`,
      ...input.rubric.map(
        (r, i) => `${i + 1}. ${r.criterion} (tối đa ${r.max_score}đ)${r.description ? ` — ${r.description}` : ""}`
      )
    );
  }

  sections.push(``, `## Bài làm của học viên:`);

  if (input.content) sections.push(``, `--- Nội dung bài làm ---`, input.content);
  if (input.promptUsed) sections.push(``, `--- Prompt học viên đã dùng với công cụ AI ---`, input.promptUsed);
  if (input.aiOutput) sections.push(``, `--- Kết quả AI trả về mà học viên đính kèm ---`, input.aiOutput);
  if (input.reflection) sections.push(``, `--- Nhận xét/phản tư cá nhân của học viên ---`, input.reflection);

  if (input.quizQuestions.length > 0 && input.quizAnswers) {
    sections.push(``, `--- Kết quả trắc nghiệm (đã chấm máy, chỉ để tham khảo) ---`);
    input.quizQuestions.forEach((q, i) => {
      const chosen = input.quizAnswers?.[i];
      const isCorrect = chosen === q.correct_index;
      sections.push(`Câu ${i + 1}: ${isCorrect ? "Đúng" : "Sai"}`);
    });
  }

  if (input.hasAttachment) {
    sections.push(
      ``,
      `Lưu ý: học viên có đính kèm 1 file mà bạn không đọc được nội dung trực tiếp. Hãy chấm dựa trên các` +
        ` phần nội dung text ở trên, và trong feedback hãy nhắc admin tự mở file đính kèm để xem thêm trước khi chốt điểm.`
    );
  }

  sections.push(
    ``,
    `Trả lời đúng theo schema JSON đã yêu cầu. Nếu đề có rubric, "rubric_scores" phải có đúng ${input.rubric.length} phần tử theo thứ tự trên; nếu không có rubric thì để mảng rỗng.`
  );

  return sections.filter(Boolean).join("\n");
}

export async function gradeSubmissionWithAI(input: AIGradingInput): Promise<AIGradingResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Chưa cấu hình GOOGLE_AI_API_KEY trên server." };
  }

  const hasGradableText = Boolean(
    input.content || input.promptUsed || input.aiOutput || input.reflection
  );
  if (!hasGradableText && !input.hasAttachment) {
    return { success: false, error: "Bài nộp không có nội dung để AI chấm điểm." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(input),
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) return { success: false, error: "AI không trả về kết quả." };

    const parsed = JSON.parse(text) as { total_score?: number; rubric_scores?: number[]; feedback?: string };

    const clamp = (v: number, max: number) => Math.max(0, Math.min(Math.round(v), max));
    const rubricScores =
      input.rubric.length > 0 && Array.isArray(parsed.rubric_scores)
        ? input.rubric.map((r, i) => clamp(parsed.rubric_scores?.[i] ?? 0, r.max_score))
        : undefined;
    const totalScore = rubricScores
      ? rubricScores.reduce((sum, s) => sum + s, 0)
      : clamp(parsed.total_score ?? 0, input.maxScore);

    return {
      success: true,
      totalScore,
      rubricScores,
      feedback: parsed.feedback ?? "",
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Lỗi không xác định khi gọi AI." };
  }
}
