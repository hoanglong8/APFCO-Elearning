"use client";

import { useRef, useState } from "react";
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
import { Plus, Trash2, Save, ClipboardList, Pencil, Trash, Paperclip, Upload, X, FileText } from "lucide-react";
import type { Assignment, Module, RubricItem, QuizQuestion, AssignmentAttachment } from "@/types/database.types";
import { ASSIGNMENT_TYPE_LABELS, DEPARTMENTS, formatDate } from "@/lib/utils";
import { createMaterialUploadUrl } from "@/app/admin/materials/actions";

const MAX_ATTACHMENT_MB = 20;
const MAX_ATTACHMENTS = 10;

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
  quiz: [] as QuizQuestion[],
  attachments: [] as AssignmentAttachment[],
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
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const attachmentRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setNewAttachmentFiles([]);
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
      quiz: a.quiz_questions ?? [],
      attachments: a.attachments ?? [],
    });
    setNewAttachmentFiles([]);
    setError("");
    setDialogOpen(true);
  }

  function addAttachmentFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setNewAttachmentFiles((prev) => {
      const combined = [...prev, ...Array.from(files)];
      const totalExisting = form.attachments.length;
      if (totalExisting + combined.length > MAX_ATTACHMENTS) {
        setError(`Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} file.`);
        return combined.slice(0, Math.max(0, MAX_ATTACHMENTS - totalExisting));
      }
      return combined;
    });
    if (attachmentRef.current) attachmentRef.current.value = "";
  }

  function removeExistingAttachment(index: number) {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== index) }));
  }

  function removeNewAttachmentFile(index: number) {
    setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
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

  function addQuizQuestion() {
    setForm((f) => ({
      ...f,
      quiz: [...f.quiz, { question: "", options: ["", ""], correct_index: 0 }],
    }));
  }

  function updateQuizQuestion(qi: number, patch: Partial<QuizQuestion>) {
    setForm((f) => {
      const quiz = [...f.quiz];
      quiz[qi] = { ...quiz[qi], ...patch };
      return { ...f, quiz };
    });
  }

  function updateQuizOption(qi: number, oi: number, value: string) {
    setForm((f) => {
      const quiz = [...f.quiz];
      const options = [...quiz[qi].options];
      options[oi] = value;
      quiz[qi] = { ...quiz[qi], options };
      return { ...f, quiz };
    });
  }

  function removeQuizOption(qi: number, oi: number) {
    setForm((f) => {
      const quiz = [...f.quiz];
      const q = quiz[qi];
      const options = q.options.filter((_, j) => j !== oi);
      const correct_index = q.correct_index === oi ? 0 : q.correct_index > oi ? q.correct_index - 1 : q.correct_index;
      quiz[qi] = { ...q, options, correct_index };
      return { ...f, quiz };
    });
  }

  async function handleSave() {
    if (!form.title) return;
    const isQuiz = form.assignmentType === "quiz";

    if (isQuiz) {
      if (form.quiz.length === 0) {
        setError("Bài trắc nghiệm cần ít nhất 1 câu hỏi.");
        return;
      }
      const invalid = form.quiz.find(
        (q) => !q.question.trim() || q.options.length < 2 || q.options.some((o) => !o.trim())
      );
      if (invalid) {
        setError("Mỗi câu hỏi cần nội dung, ít nhất 2 phương án và không có phương án trống.");
        return;
      }
    }

    const oversized = newAttachmentFiles.find((f) => f.size > MAX_ATTACHMENT_MB * 1024 * 1024);
    if (oversized) {
      setError(`File "${oversized.name}" vượt quá ${MAX_ATTACHMENT_MB}MB.`);
      return;
    }
    if (form.attachments.length + newAttachmentFiles.length > MAX_ATTACHMENTS) {
      setError(`Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} file.`);
      return;
    }

    setSaving(true);
    setError("");
    const rubricTotal = form.rubric.reduce((s, r) => s + r.max_score, 0);

    const uploadedAttachments: AssignmentAttachment[] = [];
    for (const file of newAttachmentFiles) {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `assignments/${Date.now()}-${safeName}`;
      try {
        const { token } = await createMaterialUploadUrl(path);
        const { error: uploadErr } = await supabase.storage.from("materials").uploadToSignedUrl(path, token, file);
        if (uploadErr) {
          setError(`Lỗi upload file "${file.name}": ` + uploadErr.message);
          setSaving(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
        uploadedAttachments.push({ url: publicUrl, name: file.name });
      } catch (err: any) {
        setError(`Lỗi upload file "${file.name}": ` + (err?.message ?? "không xác định"));
        setSaving(false);
        return;
      }
    }

    const finalAttachments = [...form.attachments, ...uploadedAttachments];

    const payload = {
      title: form.title,
      description: form.description || null,
      module_id: form.moduleId || null,
      assignment_type: form.assignmentType as any,
      max_score: !isQuiz && form.rubric.length > 0 ? rubricTotal : parseInt(form.maxScore) || 0,
      due_date: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      // Trang bài tập của học viên lọc theo "department_tags chứa 'all' HOẶC chứa phòng ban của học viên"
      // (app/(student)/assignments/page.tsx) — null sẽ khiến bài tập biến mất khỏi mọi học viên.
      department_tags: form.departmentTags.length > 0 ? form.departmentTags : ["all"],
      rubric: !isQuiz && form.rubric.length > 0 ? form.rubric : null,
      quiz_questions: isQuiz ? form.quiz : null,
      attachments: finalAttachments,
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
    setNewAttachmentFiles([]);
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
                    {a.attachments && a.attachments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> {a.attachments.length} file
                      </span>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> File đính kèm (đề bài, tài liệu mẫu — không bắt buộc, tối đa {MAX_ATTACHMENTS} file)
              </Label>

              {(form.attachments.length > 0 || newAttachmentFiles.length > 0) && (
                <div className="space-y-1.5">
                  {form.attachments.map((att, i) => (
                    <div key={`existing-${i}`} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline truncate flex-1 min-w-0">
                        {att.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(i)}
                        className="text-gray-300 hover:text-red-500 flex-shrink-0"
                        title="Xoá file đính kèm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {newAttachmentFiles.map((file, i) => (
                    <div key={`new-${i}`} className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-1.5">
                      <Upload className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="truncate flex-1 min-w-0">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">chưa lưu</span>
                      <button
                        type="button"
                        onClick={() => removeNewAttachmentFile(i)}
                        className="text-gray-300 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => attachmentRef.current?.click()}
                disabled={form.attachments.length + newAttachmentFiles.length >= MAX_ATTACHMENTS}
              >
                <Upload className="w-3 h-3" /> Thêm file
              </Button>
              <input
                ref={attachmentRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => addAttachmentFiles(e.target.files)}
              />
              <p className="text-xs text-gray-400">PDF, Word, Excel, ảnh (PNG/JPG) · Mỗi file tối đa {MAX_ATTACHMENT_MB}MB</p>
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

            {/* Quiz builder */}
            {form.assignmentType === "quiz" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Câu hỏi trắc nghiệm ({form.quiz.length})</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuizQuestion} className="gap-1 h-7 text-xs">
                    <Plus className="w-3 h-3" /> Thêm câu hỏi
                  </Button>
                </div>
                {form.quiz.map((q, qi) => (
                  <div key={qi} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-500 pt-1.5 flex-shrink-0">Câu {qi + 1}</span>
                      <Textarea
                        className="text-sm min-h-[38px]"
                        rows={1}
                        placeholder="Nội dung câu hỏi"
                        value={q.question}
                        onChange={(e) => updateQuizQuestion(qi, { question: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, quiz: f.quiz.filter((_, j) => j !== qi) }))}
                        className="text-gray-300 hover:text-red-500 pt-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 pl-4">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correct_index === oi}
                            onChange={() => updateQuizQuestion(qi, { correct_index: oi })}
                            className="accent-green-600 flex-shrink-0"
                            title="Chọn làm đáp án đúng"
                          />
                          <Input
                            className="h-8 text-sm"
                            placeholder={`Phương án ${oi + 1}`}
                            value={opt}
                            onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeQuizOption(qi, oi)}
                              className="text-gray-300 hover:text-red-500 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-gray-500"
                        onClick={() => updateQuizQuestion(qi, { options: [...q.options, ""] })}
                      >
                        <Plus className="w-3 h-3" /> Thêm phương án
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 pl-4">Chọn nút tròn bên trái để đánh dấu đáp án đúng.</p>
                  </div>
                ))}
                {form.quiz.length > 0 && (
                  <p className="text-xs text-gray-400">
                    Chấm tự động: điểm = số câu đúng / {form.quiz.length} câu × {parseInt(form.maxScore) || 0} điểm tối đa.
                  </p>
                )}
              </div>
            )}

            {/* Rubric */}
            {form.assignmentType !== "quiz" && (
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
            )}

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
