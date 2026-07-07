"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { DEPARTMENTS, slugify } from "@/lib/utils";
import type { Module } from "@/types/database.types";

interface Props {
  modules: Module[];
  materialCounts: Record<string, number>;
}

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  dayNumber: "",
  orderIndex: "",
  estimatedMinutes: "",
  isPublished: false,
  departmentTags: [] as string[],
};

export function ModuleManager({ modules, materialCounts }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(mod: Module) {
    setEditingId(mod.id);
    setForm({
      title: mod.title,
      slug: mod.slug,
      description: mod.description ?? "",
      dayNumber: mod.day_number?.toString() ?? "",
      orderIndex: mod.order_index?.toString() ?? "",
      estimatedMinutes: mod.estimated_minutes?.toString() ?? "",
      isPublished: mod.is_published,
      departmentTags: (mod.department_tags ?? []).filter((t) => t in DEPARTMENTS),
    });
    setSlugTouched(true);
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

  async function handleSave() {
    if (!form.title || !form.slug) return;
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      day_number: form.dayNumber ? parseInt(form.dayNumber) : null,
      order_index: form.orderIndex ? parseInt(form.orderIndex) : null,
      estimated_minutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : null,
      is_published: form.isPublished,
      department_tags: form.departmentTags.length > 0 ? form.departmentTags : ["all"],
    };

    const { error: dbErr } = editingId
      ? await supabase.from("modules").update(payload).eq("id", editingId)
      : await supabase.from("modules").insert(payload);

    if (dbErr) {
      setError(dbErr.message.includes("duplicate") ? "Slug này đã tồn tại, hãy đổi tên khác." : "Lỗi lưu dữ liệu: " + dbErr.message);
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
    const { error: dbErr } = await supabase.from("modules").delete().eq("id", deleteTarget.id);
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
          <Plus className="w-4 h-4" /> Tạo module mới
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Thời lượng</TableHead>
              <TableHead>Tài liệu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((mod) => (
              <TableRow key={mod.id}>
                <TableCell>
                  <p className="font-medium text-gray-900">{mod.title}</p>
                  <p className="text-xs text-gray-400">{mod.slug}</p>
                </TableCell>
                <TableCell className="text-gray-600">{mod.day_number ?? "--"}</TableCell>
                <TableCell className="text-gray-600">{mod.estimated_minutes ? `${mod.estimated_minutes} phút` : "--"}</TableCell>
                <TableCell className="text-gray-600">{materialCounts[mod.id] ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={mod.is_published ? "default" : "secondary"} className="text-xs">
                    {mod.is_published ? "Đã publish" : "Nháp"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mod)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(mod)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {modules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Chưa có module nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa module" : "Tạo module mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên module *</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: slugTouched ? f.slug : slugify(title),
                  }));
                }}
                placeholder="Ngày 1 buổi sáng - Tổng quan về AI"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (đường dẫn) *</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="ngay-1-buoi-sang-tong-quan-ve-ai"
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ngày thứ</Label>
                <Input
                  type="number"
                  value={form.dayNumber}
                  onChange={(e) => setForm((f) => ({ ...f, dayNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  value={form.orderIndex}
                  onChange={(e) => setForm((f) => ({ ...f, orderIndex: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Đối tượng (phòng ban)</Label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(DEPARTMENTS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.departmentTags.includes(key)}
                      onCheckedChange={() => toggleDept(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400">Không chọn = áp dụng cho tất cả</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.isPublished}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: Boolean(v) }))}
              />
              <span className="text-sm">Publish ngay (học viên thấy được)</span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !form.title || !form.slug} className="gap-2">
                {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo module"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá module "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xoá vĩnh viễn module này cùng toàn bộ{" "}
              <strong>{deleteTarget ? materialCounts[deleteTarget.id] ?? 0 : 0} tài liệu</strong>,
              thực hành workflow và tiến độ học viên liên quan. Bài tập liên kết sẽ được giữ lại
              (chỉ gỡ liên kết module). Không thể hoàn tác.
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
              {deleting ? "Đang xoá..." : "Xoá module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
