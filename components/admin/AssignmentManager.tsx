"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import type { Module, RubricItem } from "@/types/database.types";

interface Props {
  modules: Pick<Module, "id" | "title" | "day_number">[];
  creatorId: string;
}

export function AssignmentManager({ modules, creatorId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [deptTags, setDeptTags] = useState("all");
  const [published, setPublished] = useState(false);
  const [rubric, setRubric] = useState<RubricItem[]>([]);
  const [saving, setSaving] = useState(false);

  function addRubric() {
    setRubric([...rubric, { criterion: "", max_score: 20, description: "" }]);
  }

  function updateRubric(i: number, field: keyof RubricItem, value: string | number) {
    const r = [...rubric];
    (r[i] as any)[field] = value;
    setRubric(r);
  }

  async function handleSave() {
    if (!title) return;
    setSaving(true);
    const rubricTotal = rubric.reduce((s, r) => s + r.max_score, 0);
    await supabase.from("assignments").insert({
      title,
      description: description || null,
      module_id: moduleId || null,
      max_score: rubric.length > 0 ? rubricTotal : parseInt(maxScore),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      department_tags: [deptTags],
      rubric: rubric.length > 0 ? rubric : null,
      is_published: published,
      created_by: creatorId,
    });
    setTitle(""); setDescription(""); setModuleId(""); setDueDate(""); setRubric([]);
    setShow(false);
    router.refresh();
    setSaving(false);
  }

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Tạo bài tập mới
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tạo bài tập mới</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tên bài tập *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="WF-A: Ghi chú họp → Biên bản" />
          </div>
          <div className="space-y-2">
            <Label>Module liên quan</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger><SelectValue placeholder="Không bắt buộc" /></SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>Ngày {m.day_number} – {m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mô tả / Yêu cầu bài tập</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Điểm tối đa</Label>
            <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hạn nộp</Label>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Đối tượng</Label>
            <Select value={deptTags} onValueChange={setDeptTags}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="market">Kinh doanh</SelectItem>
                <SelectItem value="factory">Nhà máy</SelectItem>
                <SelectItem value="finance">Tài chính</SelectItem>
                <SelectItem value="hr">Nhân sự</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rubric */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tiêu chí chấm điểm (Rubric)</Label>
            <Button type="button" variant="outline" size="sm" onClick={addRubric} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Thêm tiêu chí
            </Button>
          </div>
          {rubric.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-start p-3 border rounded-lg">
              <Input
                className="col-span-2 h-8 text-sm"
                placeholder="Tên tiêu chí"
                value={r.criterion}
                onChange={(e) => updateRubric(i, "criterion", e.target.value)}
              />
              <Input
                className="col-span-2 h-8 text-sm"
                placeholder="Mô tả"
                value={r.description}
                onChange={(e) => updateRubric(i, "description", e.target.value)}
              />
              <div className="flex gap-1">
                <Input
                  type="number"
                  className="h-8 text-sm"
                  placeholder="Đ"
                  value={r.max_score}
                  onChange={(e) => updateRubric(i, "max_score", parseInt(e.target.value) || 0)}
                />
                <button onClick={() => setRubric(rubric.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded" />
          <span className="text-sm">Publish ngay (học viên thấy được)</span>
        </label>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !title} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Tạo bài tập"}
          </Button>
          <Button variant="outline" onClick={() => setShow(false)}>Hủy</Button>
        </div>
      </CardContent>
    </Card>
  );
}
