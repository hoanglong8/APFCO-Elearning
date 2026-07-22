import { GoogleGenAI, Type } from "@google/genai";
import type { RubricItem, QuizQuestion } from "@/types/database.types";

const MODEL = "gemini-3.5-flash";

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
  // Song song với input.rubric theo đúng thứ tự — LUÔN có mặt khi bài có rubric
  // (nếu AI không trả breakdown đúng, ta tự chia điểm theo trọng số max_score).
  rubricScores?: number[];
  error?: string;
}

function buildResponseSchema(hasRubric: boolean) {
  return {
    type: Type.OBJECT,
    properties: {
      total_score: {
        type: Type.INTEGER,
        description: "Tổng điểm đề xuất, số nguyên từ 0 đến điểm tối đa của bài tập.",
      },
      ...(hasRubric
        ? {
            rubric_scores: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Điểm cho từng tiêu chí rubric, đúng theo thứ tự đề bài, đủ số phần tử — không được để trống.",
            },
          }
        : {}),
      feedback: {
        type: Type.STRING,
        description: "Nhận xét chi tiết bằng tiếng Việt cho học viên: điểm mạnh, điểm cần cải thiện.",
      },
    },
    required: hasRubric ? ["total_score", "rubric_scores", "feedback"] : ["total_score", "feedback"],
  };
}

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
      `## Tiêu chí chấm (rubric) — BẮT BUỘC chấm điểm cho TỪNG tiêu chí theo đúng thứ tự dưới đây (trả về đủ ${input.rubric.length} số trong "rubric_scores", không được để trống hay thiếu phần tử), mỗi điểm không vượt quá điểm tối đa của tiêu chí đó:`,
      ...input.rubric.map(
        (r, i) => `${i + 1}. ${r.criterion} (tối đa ${r.max_score}đ)${r.description ? ` — ${r.description}` : ""}`
      )
    );
  }

  sections.push(
    ``,
    `## Lưu ý quan trọng khi đọc bài làm:`,
    `Học viên đôi khi điền NHẦM Ô khi nộp bài — ví dụ dán prompt vào ô "kết quả AI trả về", hoặc dán kết quả AI` +
      ` vào ô "prompt đã dùng", hay nhầm lẫn tương tự. Vì vậy NHÃN của các đoạn bên dưới CÓ THỂ SAI — đừng tin` +
      ` tuyệt đối vào tên nhãn. Hãy tự đọc NỘI DUNG THỰC TẾ của từng đoạn để suy luận đúng vai trò của nó:`,
    `- Đoạn nào mang tính RA LỆNH cho AI (dạng "hãy...", "viết...", "tóm tắt...", "tạo giúp tôi...") thì đó là PROMPT,` +
      ` dù nó đang nằm dưới nhãn nào.`,
    `- Đoạn nào là một SẢN PHẨM/KẾT QUẢ HOÀN CHỈNH (email, bản tóm tắt, đoạn văn trả lời trực tiếp yêu cầu đề bài)` +
      ` thì đó là bài làm/kết quả thực tế của học viên, dù nó đang nằm dưới nhãn nào.`,
    `Sau khi đã xác định lại đúng vai trò thực tế của từng đoạn theo nội dung (không theo nhãn), hãy chấm điểm` +
      ` dựa trên bài làm/kết quả thực tế đó. Tuyệt đối không trừ điểm hay cho điểm 0 chỉ vì nội dung nằm sai ô.`
  );

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

  sections.push(``, `Trả lời đúng theo schema JSON đã yêu cầu.`);

  return sections.filter(Boolean).join("\n");
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(Math.round(v), max));

// Khi AI không trả breakdown theo rubric hợp lệ (thiếu/sai số phần tử), chia
// totalScore theo trọng số max_score của từng tiêu chí để rubric_scores luôn
// có giá trị hiển thị được, thay vì để trống khiến UI trông như "chưa chấm".
function distributeByWeight(total: number, rubric: RubricItem[]): number[] {
  const maxSum = rubric.reduce((s, r) => s + r.max_score, 0) || 1;
  const scores = rubric.map((r) => clamp((total * r.max_score) / maxSum, r.max_score));
  const diff = total - scores.reduce((s, v) => s + v, 0);
  const lastIdx = scores.length - 1;
  scores[lastIdx] = clamp(scores[lastIdx] + diff, rubric[lastIdx].max_score);
  return scores;
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

  const hasRubric = input.rubric.length > 0;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(input),
      config: {
        // Chấm điểm cần nhất quán, không cần sáng tạo — hạ temperature để giảm
        // biến thiên giữa các lần chấm cùng 1 bài.
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(hasRubric),
      },
    });

    const text = response.text;
    if (!text) return { success: false, error: "AI không trả về kết quả." };

    const parsed = JSON.parse(text) as { total_score?: number; rubric_scores?: number[]; feedback?: string };

    if (typeof parsed.total_score !== "number" && !Array.isArray(parsed.rubric_scores)) {
      return { success: false, error: "AI không trả về điểm hợp lệ, vui lòng thử lại." };
    }

    let rubricScores: number[] | undefined;
    let totalScore: number;

    if (hasRubric) {
      const raw = parsed.rubric_scores;
      if (Array.isArray(raw) && raw.length === input.rubric.length) {
        rubricScores = input.rubric.map((r, i) => clamp(raw[i] ?? 0, r.max_score));
        totalScore = rubricScores.reduce((sum, s) => sum + s, 0);
      } else {
        // AI không trả breakdown đúng số tiêu chí — vẫn đảm bảo có điểm hiển thị
        // bằng cách chia tổng điểm theo trọng số, thay vì bỏ trống.
        totalScore = clamp(parsed.total_score ?? 0, input.maxScore);
        rubricScores = distributeByWeight(totalScore, input.rubric);
      }
    } else {
      totalScore = clamp(parsed.total_score ?? 0, input.maxScore);
    }

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
