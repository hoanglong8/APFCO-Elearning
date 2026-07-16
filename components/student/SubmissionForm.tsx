"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Save, Paperclip, X, AlertTriangle } from "lucide-react";
import type { Submission } from "@/types/database.types";
import { STATUS_LABELS } from "@/lib/utils";

interface Props {
  assignmentId: string;
  studentId: string;
  existingSubmission: Submission | null;
  maxScore: number;
  dueDate: string | null;
  /** Signed URL để xem file đã đính kèm (bucket private) */
  existingFileSignedUrl: string | null;
}

const MAX_FILE_MB = 20;

export function SubmissionForm({
  assignmentId, studentId, existingSubmission, maxScore, dueDate, existingFileSignedUrl,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const isLocked = existingSubmission?.status === "graded";
  const isPastDue = Boolean(dueDate && new Date(dueDate) < new Date());

  const [content, setContent] = useState(existingSubmission?.content ?? "");
  const [promptUsed, setPromptUsed] = useState(existingSubmission?.prompt_used ?? "");
  const [aiOutput, setAiOutput] = useState(existingSubmission?.ai_output ?? "");
  const [reflection, setReflection] = useState(existingSubmission?.reflection ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(status: "draft" | "submitted") {
    setSaving(true);
    setError("");

    let fileUrl = existingSubmission?.file_url ?? null;

    if (file) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`File vượt quá ${MAX_FILE_MB}MB.`);
        setSaving(false);
        return;
      }
      // Path theo quy ước RLS: {student_id}/{assignment_id}/...
      // Storage key không nhận ký tự có dấu — sanitize tên file
      const safeName = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${studentId}/${assignmentId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("submissions")
        .upload(path, file);
      if (uploadErr) {
        setError("Lỗi upload file: " + uploadErr.message);
        setSaving(false);
        return;
      }
      fileUrl = path;
    }

    const payload = {
      assignment_id: assignmentId,
      student_id: studentId,
      content,
      prompt_used: promptUsed,
      ai_output: aiOutput,
      reflection,
      file_url: fileUrl,
      status,
    };

    const { error: dbErr } = existingSubmission?.id
      ? await supabase.from("submissions").update(payload).eq("id", existingSubmission.id)
      : await supabase.from("submissions").insert(payload);

    if (dbErr) {
      setError("Lỗi lưu bài: " + dbErr.message);
      setSaving(false);
      return;
    }

    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Bài làm của bạn</CardTitle>
          <div className="flex items-center gap-2">
            {existingSubmission?.is_late && (
              <Badge className="text-xs border-0 bg-amber-50 text-amber-700">Nộp muộn</Badge>
            )}
            {existingSubmission && (
              <Badge className={`text-xs border-0 ${
                existingSubmission.status === "graded" ? "bg-green-50 text-green-700" :
                existingSubmission.status === "submitted" ? "bg-blue-50 text-blue-700" :
                existingSubmission.status === "returned" ? "bg-orange-50 text-orange-700" :
                "bg-gray-50 text-gray-500"
              }`}>
                {STATUS_LABELS[existingSubmission.status]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLocked && isPastDue && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Đã quá hạn nộp — bài của bạn sẽ bị đánh dấu là nộp muộn.
          </div>
        )}

        {existingSubmission?.status === "returned" && (
          <div className="text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
            Trainer đã trả bài và yêu cầu bạn chỉnh sửa rồi nộp lại.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="content">Nội dung bài làm *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Viết nội dung bài làm của bạn vào đây..."
            disabled={isLocked}
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
            disabled={isLocked}
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
            disabled={isLocked}
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
            disabled={isLocked}
          />
        </div>

        {/* File đính kèm */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> File đính kèm (không bắt buộc)
          </Label>
          {existingFileSignedUrl && !file && (
            <p className="text-sm">
              <a
                href={existingFileSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Xem file đã nộp
              </a>
              {!isLocked && <span className="text-gray-400"> — chọn file mới để thay thế</span>}
            </p>
          )}
          {!isLocked && (
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
              />
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {!isLocked && (
            <p className="text-xs text-gray-400">PDF, Office, ảnh, ZIP · Tối đa {MAX_FILE_MB}MB</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!isLocked && (
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
              {saving ? "Đang nộp..." : existingSubmission?.status === "returned" ? "Nộp lại" : "Nộp bài"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
