"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Save } from "lucide-react";
import type { Submission } from "@/types/database.types";
import { STATUS_LABELS } from "@/lib/utils";

interface Props {
  assignmentId: string;
  studentId: string;
  existingSubmission: Submission | null;
  maxScore: number;
}

export function SubmissionForm({ assignmentId, studentId, existingSubmission, maxScore }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isGraded = existingSubmission?.status === "graded";

  const [content, setContent] = useState(existingSubmission?.content ?? "");
  const [promptUsed, setPromptUsed] = useState(existingSubmission?.prompt_used ?? "");
  const [aiOutput, setAiOutput] = useState(existingSubmission?.ai_output ?? "");
  const [reflection, setReflection] = useState(existingSubmission?.reflection ?? "");
  const [saving, setSaving] = useState(false);

  async function save(status: "draft" | "submitted") {
    setSaving(true);
    const payload = { assignment_id: assignmentId, student_id: studentId, content, prompt_used: promptUsed, ai_output: aiOutput, reflection, status };
    if (existingSubmission?.id) {
      await supabase.from("submissions").update(payload).eq("id", existingSubmission.id);
    } else {
      await supabase.from("submissions").insert(payload);
    }
    router.refresh();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Bài làm của bạn</CardTitle>
          {existingSubmission && (
            <Badge className={`text-xs border-0 ${
              existingSubmission.status === "graded" ? "bg-green-50 text-green-700" :
              existingSubmission.status === "submitted" ? "bg-blue-50 text-blue-700" :
              "bg-gray-50 text-gray-500"
            }`}>
              {STATUS_LABELS[existingSubmission.status]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="content">Nội dung bài làm *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Viết nội dung bài làm của bạn vào đây..."
            disabled={isGraded}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt-used">Prompt đã sử dụng</Label>
          <Textarea
            id="prompt-used"
            value={promptUsed}
            onChange={(e) => setPromptUsed(e.target.value)}
            rows={4}
            placeholder="Dán prompt bạn đã dùng với AI..."
            disabled={isGraded}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-output">Kết quả từ AI</Label>
          <Textarea
            id="ai-output"
            value={aiOutput}
            onChange={(e) => setAiOutput(e.target.value)}
            rows={5}
            placeholder="Dán output của AI vào đây..."
            disabled={isGraded}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reflection">Nhận xét cá nhân (reflection)</Label>
          <Textarea
            id="reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            placeholder="Chia sẻ những gì bạn học được, những điều nên cải thiện..."
            disabled={isGraded}
          />
        </div>

        {!isGraded && (
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => save("draft")}
              disabled={saving || !content.trim()}
              className="gap-2"
            >
              <Save className="w-4 h-4" /> Lưu nháp
            </Button>
            <Button
              onClick={() => save("submitted")}
              disabled={saving || !content.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {saving ? "Đang nộp..." : "Nộp bài"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
