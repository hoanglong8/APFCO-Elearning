"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { FileText, Download, ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import type { Material, Module } from "@/types/database.types";
import { createMaterialUploadUrl } from "@/app/admin/materials/actions";

interface MaterialRow extends Material {
  modules: { title: string } | null;
}

interface Props {
  materials: MaterialRow[];
  modules: Pick<Module, "id" | "title" | "day_number">[];
}

const typeColor: Record<string, string> = {
  slide: "bg-blue-50 text-blue-700",
  pdf: "bg-red-50 text-red-700",
  video: "bg-purple-50 text-purple-700",
  prompt: "bg-green-50 text-green-700",
  link: "bg-orange-50 text-orange-700",
};

function extractStoragePath(fileUrl: string | null) {
  if (!fileUrl) return null;
  const marker = "/object/public/materials/";
  const idx = fileUrl.indexOf(marker);
  return idx === -1 ? null : fileUrl.slice(idx + marker.length);
}

export function MaterialTable({ materials, modules }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<MaterialRow | null>(null);
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [type, setType] = useState("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(mat: MaterialRow) {
    setEditing(mat);
    setTitle(mat.title);
    setModuleId(mat.module_id);
    setType(mat.material_type);
    setExternalUrl(mat.external_url ?? "");
    setIsDownloadable(mat.is_downloadable);
    setNewFile(null);
    setError("");
  }

  async function handleSave() {
    if (!editing || !title || !moduleId) return;
    setSaving(true);
    setError("");

    let fileUrl = editing.file_url;

    if (newFile) {
      const ext = newFile.name.split(".").pop();
      const path = `${moduleId}/${Date.now()}.${ext}`;
      try {
        const { token } = await createMaterialUploadUrl(path);
        const { error: uploadErr } = await supabase.storage.from("materials").uploadToSignedUrl(path, token, newFile);
        if (uploadErr) {
          setError("Lỗi upload file: " + uploadErr.message);
          setSaving(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
        fileUrl = publicUrl;
      } catch (err: any) {
        setError("Lỗi upload file: " + (err?.message ?? "không xác định"));
        setSaving(false);
        return;
      }
    }

    const { error: dbErr } = await supabase.from("materials").update({
      title,
      module_id: moduleId,
      material_type: type as any,
      file_url: type === "link" ? null : fileUrl,
      external_url: type === "link" ? (externalUrl || null) : null,
      is_downloadable: isDownloadable,
    }).eq("id", editing.id);

    if (dbErr) {
      setError("Lỗi lưu dữ liệu: " + dbErr.message);
      setSaving(false);
      return;
    }

    setEditing(null);
    router.refresh();
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const storagePath = extractStoragePath(deleteTarget.file_url);
    if (storagePath) {
      await supabase.storage.from("materials").remove([storagePath]);
    }

    const { error: dbErr } = await supabase.from("materials").delete().eq("id", deleteTarget.id);
    if (!dbErr) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      setError("Lỗi xoá: " + dbErr.message);
    }
    setDeleting(false);
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tài liệu</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Module</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((mat) => {
            const url = mat.file_url ?? mat.external_url;
            return (
              <TableRow key={mat.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{mat.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs border-0 ${typeColor[mat.material_type] ?? "bg-gray-50 text-gray-600"}`}>
                    {mat.material_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600">{mat.modules?.title ?? "--"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {mat.file_url ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(mat)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {materials.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-400">Chưa có tài liệu nào</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa tài liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên tài liệu *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Module *</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loại tài liệu</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide">Slide (PPTX/PDF)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="prompt">Prompt Template</SelectItem>
                  <SelectItem value="link">Link ngoài</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type !== "link" ? (
              <div className="space-y-2">
                <Label>Thay file (để trống nếu giữ nguyên)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                  <p className="text-sm text-gray-500">{newFile ? newFile.name : "Click để chọn file mới"}</p>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.pptx,.ppt,.docx,.doc,.mp4,.txt"
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>URL ngoài</Label>
                <Input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isDownloadable} onCheckedChange={(v) => setIsDownloadable(Boolean(v))} />
              <span className="text-sm">Cho phép tải xuống</span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !title || !moduleId} className="gap-2">
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá tài liệu "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xoá vĩnh viễn tài liệu và file đính kèm (nếu có). Không thể hoàn tác.
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
              {deleting ? "Đang xoá..." : "Xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
