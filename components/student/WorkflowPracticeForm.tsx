"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PromptCopyButton } from "@/components/shared/PromptCopyButton";
import { Star, Send, History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { PracticeLog } from "@/types/database.types";

interface Props {
  wfId: string;
  studentId: string;
  promptTemplate: string;
  previousLogs: PracticeLog[];
}

export function WorkflowPracticeForm({ wfId, studentId, promptTemplate, previousLogs }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [promptInput, setPromptInput] = useState(promptTemplate);
  const [aiOutput, setAiOutput] = useState("");
  const [toolUsed, setToolUsed] = useState("chatgpt");
  const [selfRating, setSelfRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiOutput.trim()) return;
    setSaving(true);
    await supabase.from("practice_logs").insert({
      student_id: studentId,
      wf_id: wfId,
      prompt_input: promptInput,
      ai_output: aiOutput,
      tool_used: toolUsed,
      self_rating: selfRating || null,
      notes: notes || null,
    });
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nộp kết quả thực hành</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt-input">Prompt bạn đã dùng</Label>
                <PromptCopyButton prompt={promptTemplate} />
              </div>
              <Textarea
                id="prompt-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows={5}
                placeholder="Dán prompt bạn đã chỉnh sửa và sử dụng..."
              />
            </div>

            <div className="space-y-2">
              <Label>Công cụ AI đã dùng</Label>
              <Select value={toolUsed} onValueChange={setToolUsed}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="notebooklm">NotebookLM</SelectItem>
                  <SelectItem value="copilot">Microsoft Copilot</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-output">Kết quả AI trả về *</Label>
              <Textarea
                id="ai-output"
                value={aiOutput}
                onChange={(e) => setAiOutput(e.target.value)}
                rows={6}
                placeholder="Dán kết quả AI vào đây..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tự đánh giá kết quả</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelfRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= selfRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                {selfRating > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    {["", "Cần cải thiện nhiều", "Còn thiếu", "Ổn", "Khá tốt", "Rất tốt"][selfRating]}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Nhận xét / Bài học rút ra</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Chia sẻ những gì bạn học được từ bài thực hành này..."
              />
            </div>

            <Button type="submit" disabled={saving || !aiOutput.trim()} className="w-full gap-2">
              {saving ? "Đang lưu..." : saved ? "Đã lưu!" : <><Send className="w-4 h-4" /> Lưu kết quả thực hành</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      {previousLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Lịch sử thực hành ({previousLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previousLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{log.tool_used}</Badge>
                  <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                </div>
                {log.self_rating && (
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= log.self_rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                )}
                {log.notes && <p className="text-xs text-gray-600">{log.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
