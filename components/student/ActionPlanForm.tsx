"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, CheckCircle2, Target } from "lucide-react";
import type { ActionPlan, UseCase } from "@/types/database.types";

interface Props {
  studentId: string;
  existingPlan: ActionPlan | null;
  suggestedUseCases: { title: string; tool: string; frequency: string }[];
}

const emptyUseCase = (): UseCase => ({
  title: "",
  tool: "ChatGPT",
  frequency: "Hàng tuần",
  expected_outcome: "",
  status: "planned",
});

export function ActionPlanForm({ studentId, existingPlan, suggestedUseCases }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [useCases, setUseCases] = useState<UseCase[]>(
    (existingPlan?.use_cases as UseCase[]) ?? [emptyUseCase()]
  );
  const [week2Checkin, setWeek2Checkin] = useState(existingPlan?.week2_checkin ?? "");
  const [committed, setCommitted] = useState(existingPlan?.committed ?? false);
  const [saving, setSaving] = useState(false);

  function addUseCase() {
    if (useCases.length >= 5) return;
    setUseCases([...useCases, emptyUseCase()]);
  }

  function removeUseCase(i: number) {
    setUseCases(useCases.filter((_, idx) => idx !== i));
  }

  function updateUseCase(i: number, field: keyof UseCase, value: string) {
    const updated = [...useCases];
    (updated[i] as any)[field] = value;
    setUseCases(updated);
  }

  function addSuggested(suggestion: { title: string; tool: string; frequency: string }) {
    if (useCases.length >= 5) return;
    setUseCases([...useCases, { ...emptyUseCase(), ...suggestion }]);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      student_id: studentId,
      use_cases: useCases.filter((uc) => uc.title.trim()),
      week2_checkin: week2Checkin || null,
      committed,
    };
    if (existingPlan?.id) {
      await supabase.from("action_plans").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingPlan.id);
    } else {
      await supabase.from("action_plans").insert(payload);
    }
    router.refresh();
    setSaving(false);
  }

  const completedCount = useCases.filter((uc) => uc.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      {existingPlan && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Tiến độ thực hiện</p>
              <p className="text-sm text-gray-500">{completedCount}/{useCases.length} use case đã hoàn thành</p>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {useCases.length > 0 ? Math.round((completedCount / useCases.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" /> Gợi ý Use Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {suggestedUseCases.map((s, i) => (
              <button
                key={i}
                onClick={() => addSuggested(s)}
                disabled={useCases.length >= 5}
                className="text-xs bg-white border rounded-full px-3 py-1.5 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <span className="text-gray-600">{s.title}</span>
                <span className="ml-1 text-blue-500">+ Thêm</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Use cases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Kế hoạch của tôi ({useCases.length}/5)</h2>
          <Button onClick={addUseCase} variant="outline" size="sm" disabled={useCases.length >= 5} className="gap-1">
            <Plus className="w-4 h-4" /> Thêm
          </Button>
        </div>

        {useCases.map((uc, i) => (
          <Card key={i} className={`border-l-4 ${uc.status === "done" ? "border-l-green-500" : "border-l-blue-300"}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-xs">Use case {i + 1}</Badge>
                <div className="flex items-center gap-2">
                  <select
                    value={uc.status}
                    onChange={(e) => updateUseCase(i, "status", e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-white"
                  >
                    <option value="planned">Kế hoạch</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                  <button onClick={() => removeUseCase(i)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tên use case</Label>
                <Input
                  value={uc.title}
                  onChange={(e) => updateUseCase(i, "title", e.target.value)}
                  placeholder="Ví dụ: Tự động tạo biên bản họp..."
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Công cụ AI</Label>
                  <select
                    value={uc.tool}
                    onChange={(e) => updateUseCase(i, "tool", e.target.value)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
                  >
                    <option>ChatGPT</option>
                    <option>Gemini</option>
                    <option>NotebookLM</option>
                    <option>Microsoft Copilot</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tần suất</Label>
                  <select
                    value={uc.frequency}
                    onChange={(e) => updateUseCase(i, "frequency", e.target.value)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
                  >
                    <option>Hàng ngày</option>
                    <option>Hàng tuần</option>
                    <option>Khi cần</option>
                    <option>2-3 lần/tuần</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Kết quả mong đợi</Label>
                <Input
                  value={uc.expected_outcome}
                  onChange={(e) => updateUseCase(i, "expected_outcome", e.target.value)}
                  placeholder="Tiết kiệm 2 giờ/tuần soạn biên bản..."
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week 2 check-in */}
      {existingPlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Check-in Tuần 2</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={week2Checkin}
              onChange={(e) => setWeek2Checkin(e.target.value)}
              rows={4}
              placeholder="Chia sẻ kết quả thực hiện kế hoạch sau 2 tuần: Những gì đã làm được? Những khó khăn gặp phải?"
            />
          </CardContent>
        </Card>
      )}

      {/* Commit */}
      <Card className={`${committed ? "border-green-300 bg-green-50" : ""}`}>
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={committed}
              onChange={(e) => setCommitted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">Tôi cam kết thực hiện kế hoạch trên</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Tôi sẽ áp dụng AI vào công việc hàng ngày và báo cáo kết quả sau 2 tuần.
              </p>
            </div>
            {committed && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" />}
          </label>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Đang lưu..." : "Lưu kế hoạch"}
      </Button>
    </div>
  );
}
