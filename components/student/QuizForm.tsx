"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, AlertTriangle } from "lucide-react";
import { submitQuiz } from "@/app/(student)/assignments/actions";

interface Props {
  assignmentId: string;
  /** Câu hỏi đã bị loại bỏ correct_index trước khi truyền xuống client */
  questions: { question: string; options: string[] }[];
  isPastDue: boolean;
}

export function QuizForm({ assignmentId, questions, isPastDue }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const answeredAll = questions.every((_, i) => answers[i] !== undefined);

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const result = await submitQuiz(assignmentId, questions.map((_, i) => answers[i]));
    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bài trắc nghiệm · {questions.length} câu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isPastDue && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Đã quá hạn nộp — bài của bạn sẽ bị đánh dấu là nộp muộn.
          </div>
        )}

        {questions.map((q, qi) => (
          <div key={qi} className="space-y-2">
            <p className="font-medium text-sm text-gray-900">
              Câu {qi + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                    answers[qi] === oi
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${qi}`}
                    checked={answers[qi] === oi}
                    onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className="accent-green-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button onClick={handleSubmit} disabled={saving || !answeredAll} className="gap-2">
          <Send className="w-4 h-4" />
          {saving ? "Đang nộp..." : answeredAll ? "Nộp bài trắc nghiệm" : "Trả lời đủ các câu để nộp"}
        </Button>
        <p className="text-xs text-gray-400">
          Bài trắc nghiệm được chấm tự động và chỉ làm một lần.
        </p>
      </CardContent>
    </Card>
  );
}
