"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Link2, Plus } from "lucide-react";
import type { Module } from "@/types/database.types";

interface Props {
  modules: Pick<Module, "id" | "title" | "day_number">[];
}

export function MaterialUploader({ modules }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [type, setType] = useState("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !moduleId) return;
    setUploading(true);
    setError("");

    let fileUrl: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${moduleId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("materials")
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        setError("Lỗi upload file: " + uploadErr.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
      fileUrl = publicUrl;
    }

    const { error: dbErr } = await supabase.from("materials").insert({
      module_id: moduleId,
      title,
      material_type: type as any,
      file_url: fileUrl,
      external_url: externalUrl || null,
      is_downloadable: type !== "link",
    });

    if (dbErr) {
      setError("Lỗi lưu dữ liệu: " + dbErr.message);
    } else {
      setTitle("");
      setExternalUrl("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShow(false);
      router.refresh();
    }
    setUploading(false);
  }

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Thêm tài liệu mới
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="w-4 h-4" /> Thêm tài liệu mới
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên tài liệu *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Slide Ngày 1 – Tổng quan AI" required />
            </div>
            <div className="space-y-2">
              <Label>Module *</Label>
              <Select value={moduleId} onValueChange={setModuleId} required>
                <SelectTrigger><SelectValue placeholder="Chọn module" /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>Ngày {m.day_number} – {m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Upload file</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">{file ? file.name : "Click để chọn file"}</p>
                <p className="text-xs text-gray-400 mt-1">PDF, PPTX, DOCX, MP4 · Tối đa 50MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.mp4,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Link2 className="w-3 h-3" /> URL ngoài
              </Label>
              <Input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://docs.google.com/..."
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={uploading || !title || !moduleId} className="gap-2">
              <Upload className="w-4 h-4" />
              {uploading ? "Đang upload..." : "Upload"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShow(false)}>Hủy</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
