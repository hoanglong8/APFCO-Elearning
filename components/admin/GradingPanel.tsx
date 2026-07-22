"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import type { Submission, RubricItem } from "@/types/database.types";
import { gradeSubmissionWithAIAction } from "@/app/admin/grading/actions";

interface Props {
  submission: Submission;
  rubric: RubricItem[];
  maxScore: number;
  graderId: string;
}

export function GradingPanel({ submission, rubric, maxScore, graderId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [rubricScores, setRubricScores] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggested, setAiSuggested] = useState(false);

  async function handleAIGrade() {
    setAiLoading(true);
    setAiError("");
    try {
      const result = await gradeSubmissionWithAIAction(submission.id);
      if (!result.success) {
        setAiError(result.error ?? "AI chấm điểm thất bại.");
        return;
      }
      if (rubric.length > 0) {
        if (!result.rubricScores) {
          setAiError("AI không trả về điểm theo rubric, vui lòng thử lại.");
          return;
        }
        setRubricScores(Object.fromEntries(result.rubricScores.map((s, i) => [i, s])));
      } else if (typeof result.totalScore === "number") {
        setScore(result.totalScore.toString());
      }
      setFeedback(result.feedback ?? "");
      setAiSuggested(true);
    } catch (err: any) {
      setAiError(err?.message ?? "Có lỗi xảy ra.");
    } finally {
      setAiLoading(false);
    }
  }

  const rubricTotal = Object.values(rubricScores).reduce((sum, s) => sum + s, 0);
  const computedScore = rubric.length > 0 ? rubricTotal : parseInt(score) || 0;

  async function grade(status: "graded" | "returned") {
    const finalScore = rubric.length > 0 ? rubricTotal : parseInt(score) || 0;
    setSaving(true);
    await supabase.from("submissions").update({
      score: status === "graded" ? finalScore : submission.score,
      feedback,
      status,
      graded_by: graderId,
      graded_at: new Date().toISOString(),
    }).eq("id", submission.id);
    router.push("/admin/grading");
    router.refresh();
    setSaving(false);
  }

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chấm điểm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleAIGrade}
            disabled={aiLoading || saving}
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiLoading ? "AI đang chấm..." : "Chấm bằng AI (gợi ý)"}
          </Button>
          {aiError && <p className="text-xs text-red-500">{aiError}</p>}
          {aiSuggested && !aiError && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Điểm và nhận xét dưới đây do AI gợi ý — hãy kiểm tra lại trước khi lưu.
            </p>
          )}
        </div>

        {/* Rubric scoring */}
        {rubric.length > 0 ? (
          <div className="space-y-3">
            {rubric.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.criterion}</p>
                    {item.description && (
                      <p className="text-xs text-gray-400">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-xs">{item.max_score}đ</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={item.max_score}
                    value={rubricScores[i] ?? ""}
                    onChange={(e) => {
                      const v = Math.min(parseInt(e.target.value) || 0, item.max_score);
                      setRubricScores({ ...rubricScores, [i]: v });
                    }}
                    className="h-8 w-20 text-sm"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400">/ {item.max_score}</span>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Tổng điểm</span>
              <span className={`text-lg font-bold ${rubricTotal >= maxScore * 0.8 ? "text-green-600" : rubricTotal >= maxScore * 0.6 ? "text-yellow-600" : "text-red-500"}`}>
                {rubricTotal} / {maxScore}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Điểm (tối đa {maxScore})</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={maxScore}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-24"
                placeholder="0"
              />
              <span className="text-gray-400">/ {maxScore}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Phản hồi cho học viên</Label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            placeholder="Nhận xét về bài làm, điểm mạnh, điểm cần cải thiện..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={() => grade("graded")}
            disabled={saving}
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Chấm & Trả bài"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => grade("returned")}
            disabled={saving}
            title="Yêu cầu nộp lại"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {submission.status === "graded" && (
          <div className="text-xs text-gray-400 text-center">
            Đã chấm lúc {submission.graded_at ? new Date(submission.graded_at).toLocaleString("vi-VN") : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
