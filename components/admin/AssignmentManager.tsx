"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, ClipboardList, Pencil, Trash } from "lucide-react";
import type { Assignment, Module, RubricItem } from "@/types/database.types";
import { ASSIGNMENT_TYPE_LABELS, DEPARTMENTS, formatDate } from "@/lib/utils";

interface AssignmentRow extends Assignment {
  submissionTotal: number;
  submissionPending: number;
}

interface Props {
  assignments: AssignmentRow[];
  modules: Pick<Module, "id" | "title" | "day_number">[];
  creatorId: string;
}

const emptyForm = {
  title: "",
  description: "",
  moduleId: "",
  assignmentType: "wf_practice",
  maxScore: "100",
  dueDate: "",
  departmentTags: [] as string[],
  published: false,
  rubric: [] as RubricItem[],
};

export function AssignmentManager({ assignments, modules, creatorId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(a: AssignmentRow) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description ?? "",
      moduleId: a.module_id ?? "",
      assignmentType: a.assignment_type,
      maxScore: a.max_score.toString(),
      dueDate: a.due_date ? a.due_date.slice(0, 16) : "",
      departmentTags: (a.department_tags ?? []).filter((t) => t in DEPARTMENTS),
      published: a.is_published,
      rubric: a.rubric ?? [],
    });
    setError("");
    setDialogOpen(true);
  }

  function toggleDept(key: string) {
    setForm((f) => ({
      ...f,
      departmentTags: f.departmentTags.includes(key)
        ? f.departmentTags.filter((d) => d !== key)
        : [...f.departmentTags, key],
    }));
  }

  function addRubric() {
    setForm((f) => ({ ...f, rubric: [...f.rubric, { criterion: "", max_score: 20, description: "" }] }));
  }

  function updateRubric(i: number, field: keyof RubricItem, value: string | number) {
    setForm((f) => {
      const rubric = [...f.rubric];
      (rubric[i] as any)[field] = value;
      return { ...f, rubric };
    });
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    setError("");
    const rubricTotal = form.rubric.reduce((s, r) => s + r.max_score, 0);

    const payload = {
      title: form.title,
      description: form.description || null,
      module_id: form.moduleId || null,
      assignment_type: form.assignmentType as any,
      max_score: form.rubric.length > 0 ? rubricTotal : parseInt(form.maxScore) || 0,
      due_date: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      // Trang bài tập của học viên lọc theo "department_tags chứa 'all' HOẶC chứa phòng ban của học viên"
      // (app/(student)/assignments/page.tsx) — null sẽ khiến bài tập biến mất khỏi mọi học viên.
      department_tags: form.departmentTags.length > 0 ? form.departmentTags : ["all"],
      rubric: form.rubric.length > 0 ? form.rubric : null,
      is_published: form.published,
    };

    const { error: dbErr } = editingId
      ? await supabase.from("assignments").update(payload).eq("id", editingId)
      : await supabase.from("assignments").insert({ ...payload, created_by: creatorId });

    if (dbErr) {
      setError("Lỗi lưu dữ liệu: " + dbErr.message);
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    router.refresh();
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: dbErr } = await supabase.from("assignments").delete().eq("id", deleteTarget.id);
    if (!dbErr) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      setError("Lỗi xoá: " + dbErr.message);
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tạo bài tập mới
        </Button>
      </div>

      <div className="space-y-3">
        {assignments.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{a.title}</p>
                      {a.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">{ASSIGNMENT_TYPE_LABELS[a.assignment_type]}</Badge>
                      <Badge variant={a.is_published ? "default" : "secondary"} className="text-xs">
                        {a.is_published ? "Đã publish" : "Nháp"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{a.max_score} điểm</span>
                    {a.due_date && <span>Hạn: {formatDate(a.due_date)}</span>}
                    <span>{a.submissionTotal} bài nộp</span>
                    {a.submissionPending > 0 && (
                      <span className="text-orange-600 font-medium">{a.submissionPending} chờ chấm</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                    onClick={() => setDeleteTarget(a)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {assignments.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có bài tập nào</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa bài tập" : "Tạo bài tập mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên bài tập *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="WF-A: Ghi chú họp → Biên bản" />
              </div>
              <div className="space-y-2">
                <Label>Module liên quan</Label>
                <Select value={form.moduleId} onValueChange={(v) => setForm((f) => ({ ...f, moduleId: v }))}>
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
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Loại bài tập</Label>
                <Select value={form.assignmentType} onValueChange={(v) => setForm((f) => ({ ...f, assignmentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Điểm tối đa</Label>
                <Input type="number" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))} disabled={form.rubric.length > 0} />
              </div>
              <div className="space-y-2">
                <Label>Hạn nộp</Label>
                <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Đối tượng (phòng ban)</Label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(DEPARTMENTS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.departmentTags.includes(key)} onCheckedChange={() => toggleDept(key)} />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400">Không chọn = áp dụng cho tất cả</p>
            </div>

            {/* Rubric */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tiêu chí chấm điểm (Rubric)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRubric} className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Thêm tiêu chí
                </Button>
              </div>
              {form.rubric.map((r, i) => (
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
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, rubric: f.rubric.filter((_, j) => j !== i) }))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: Boolean(v) }))} />
              <span className="text-sm">Publish ngay (học viên thấy được)</span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !form.title} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo bài tập"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bài tập "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.submissionTotal > 0 ? (
                <>Bài tập này đã có <strong>{deleteTarget.submissionTotal} bài nộp</strong> từ học viên — xoá bài tập sẽ xoá vĩnh viễn toàn bộ các bài nộp đó. Không thể hoàn tác.</>
              ) : (
                <>Hành động này không thể hoàn tác.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Đang xoá..." : "Xoá bài tập"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
