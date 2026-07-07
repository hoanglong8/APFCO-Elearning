"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  UserPlus, Upload, Download, Pencil, Trash2, KeyRound, Copy, Search,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Users as UsersIcon,
} from "lucide-react";
import { DEPARTMENTS, FACTORIES, ROLES, formatDate, parseCsv } from "@/lib/utils";
import type { Profile } from "@/types/database.types";
import {
  createUserAction, updateUserAction, deleteUserAction, resetPasswordAction,
  importUsersAction, type NewUserInput, type CreateUserResult,
} from "@/app/admin/users/actions";

interface Props {
  users: Profile[];
  currentUserId: string;
}

const emptyCreateForm = { email: "", fullName: "", department: "", factory: "", role: "student" };

function roleColor(role: string) {
  if (role === "admin") return "bg-red-100 text-red-800";
  if (role === "director") return "bg-purple-100 text-purple-800";
  if (role === "trainer") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}

interface ParsedRow extends NewUserInput {
  warnings: string[];
  valid: boolean;
}

function parseAndValidateImport(text: string): ParsedRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const first = rows[0].map((c) => c.toLowerCase());
  const dataRows = first[0] === "full_name" || first[0] === "họ tên" || first[1] === "email" ? rows.slice(1) : rows;

  return dataRows.map((cols) => {
    const [fullName = "", email = "", department = "", factory = "", role = ""] = cols;
    const warnings: string[] = [];

    let dept: string | null = department || null;
    if (dept && !(dept in DEPARTMENTS)) {
      warnings.push(`Phòng ban "${dept}" không hợp lệ, sẽ để trống`);
      dept = null;
    }

    let fac: string | null = factory || null;
    if (fac && !(fac in FACTORIES)) {
      warnings.push(`Nhà máy "${fac}" không hợp lệ, sẽ để trống`);
      fac = null;
    }

    let finalRole = role || "student";
    if (!(finalRole in ROLES)) {
      warnings.push(`Role "${finalRole}" không hợp lệ, sẽ dùng "student"`);
      finalRole = "student";
    }

    const valid = Boolean(fullName.trim()) && email.includes("@");
    if (!valid) warnings.push("Thiếu họ tên hoặc email không hợp lệ");

    return { fullName: fullName.trim(), email: email.trim(), department: dept, factory: fac, role: finalRole, warnings, valid };
  });
}

function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function UserManager({ users, currentUserId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Create user
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState<CreateUserResult | null>(null);

  async function handleCreate() {
    if (!createForm.email || !createForm.fullName) return;
    setCreating(true);
    setCreateError("");
    try {
      const result = await createUserAction({
        email: createForm.email,
        fullName: createForm.fullName,
        department: createForm.department || null,
        factory: createForm.factory || null,
        role: createForm.role,
      });
      if (!result.success) {
        setCreateError(result.error ?? "Không tạo được tài khoản.");
      } else {
        setCreateOpen(false);
        setCreateForm(emptyCreateForm);
        setCreateResult(result);
        router.refresh();
      }
    } catch (err: any) {
      setCreateError(err?.message ?? "Có lỗi xảy ra.");
    }
    setCreating(false);
  }

  // Edit user
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", department: "", factory: "", role: "student", aiChampion: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit(u: Profile) {
    setEditing(u);
    setEditForm({
      fullName: u.full_name,
      department: u.department ?? "",
      factory: u.factory ?? "",
      role: u.role,
      aiChampion: u.ai_champion,
    });
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editing || !editForm.fullName) return;
    setSavingEdit(true);
    setEditError("");
    try {
      await updateUserAction({
        id: editing.id,
        fullName: editForm.fullName,
        department: editForm.department || null,
        factory: editForm.factory || null,
        role: editForm.role,
        aiChampion: editForm.aiChampion,
      });
      setEditing(null);
      router.refresh();
    } catch (err: any) {
      setEditError(err?.message ?? "Có lỗi xảy ra.");
    }
    setSavingEdit(false);
  }

  // Delete user
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteUserAction(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } catch (err: any) {
      setDeleteError(err?.message ?? "Có lỗi xảy ra.");
    }
    setDeleting(false);
  }

  // Reset password
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ user: Profile; password: string } | null>(null);

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const { password } = await resetPasswordAction(resetTarget.id);
      setResetResult({ user: resetTarget, password });
      setResetTarget(null);
    } catch (err: any) {
      alert(err?.message ?? "Có lỗi xảy ra.");
    }
    setResetting(false);
  }

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResults, setImportResults] = useState<CreateUserResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleParse() {
    setParsedRows(parseAndValidateImport(csvText));
    setImportResults([]);
  }

  async function handleFilePick(file: File) {
    const text = await file.text();
    setCsvText(text);
    setParsedRows(parseAndValidateImport(text));
    setImportResults([]);
  }

  async function handleImport() {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: validRows.length });
    const results: CreateUserResult[] = [];
    const chunkSize = 10;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const chunkResults = await importUsersAction(chunk);
      results.push(...chunkResults);
      setImportProgress({ done: results.length, total: validRows.length });
    }
    setImportResults(results);
    setImporting(false);
    router.refresh();
  }

  function downloadImportResults() {
    const header = "full_name,email,password,status,error";
    const lines = importResults.map((r) =>
      [r.fullName, r.email, r.password ?? "", r.success ? "success" : "failed", r.error ?? ""].join(",")
    );
    downloadText(`ket-qua-import-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join("\n"));
  }

  function closeImportDialog() {
    setImportOpen(false);
    setCsvText("");
    setParsedRows([]);
    setImportResults([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="pl-9 w-64"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả role</SelectItem>
              {Object.entries(ROLES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4" /> Tạo user mới
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Nhà máy</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{u.full_name}</span>
                    {u.ai_champion && <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-0">Champion</Badge>}
                    {u.id === currentUserId && <Badge variant="outline" className="text-[10px]">Bạn</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </TableCell>
                <TableCell className="text-gray-600">{u.department ? DEPARTMENTS[u.department] ?? u.department : "--"}</TableCell>
                <TableCell className="text-gray-600">{u.factory ? FACTORIES[u.factory] ?? u.factory : "--"}</TableCell>
                <TableCell>
                  <Badge className={`text-xs border-0 ${roleColor(u.role)}`}>{ROLES[u.role] ?? u.role}</Badge>
                </TableCell>
                <TableCell className="text-gray-400 text-xs">{formatDate(u.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Sửa" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Đặt lại mật khẩu" onClick={() => setResetTarget(u)}>
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      title="Xoá"
                      disabled={u.id === currentUserId}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                  <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo user mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Họ và tên *</Label>
              <Input value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Select value={createForm.department} onValueChange={(v) => setCreateForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Không bắt buộc" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nhà máy</Label>
                <Select value={createForm.factory} onValueChange={(v) => setCreateForm((f) => ({ ...f, factory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Không bắt buộc" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACTORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-400">
              Hệ thống sẽ tự sinh mật khẩu ngẫu nhiên, hiển thị 1 lần sau khi tạo để bạn gửi lại cho người dùng.
            </p>
            {createError && <p className="text-sm text-red-500">{createError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !createForm.email || !createForm.fullName} className="gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {creating ? "Đang tạo..." : "Tạo user"}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create result (show password once) */}
      <Dialog open={!!createResult} onOpenChange={(open) => !open && setCreateResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Đã tạo tài khoản
            </DialogTitle>
          </DialogHeader>
          {createResult?.success && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Gửi thông tin đăng nhập sau cho <strong>{createResult.fullName}</strong> (mật khẩu chỉ hiển thị 1 lần):
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm font-mono">
                <p>Email: {createResult.email}</p>
                <p>Mật khẩu: {createResult.password}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigator.clipboard.writeText(`Email: ${createResult.email}\nMật khẩu: ${createResult.password}`)}
              >
                <Copy className="w-3 h-3" /> Sao chép
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa thông tin người dùng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Họ và tên *</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editing?.email ?? ""} disabled className="bg-gray-50 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Select value={editForm.department} onValueChange={(v) => setEditForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Không bắt buộc" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nhà máy</Label>
                <Select value={editForm.factory} onValueChange={(v) => setEditForm((f) => ({ ...f, factory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Không bắt buộc" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACTORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={editForm.aiChampion} onCheckedChange={(v) => setEditForm((f) => ({ ...f, aiChampion: Boolean(v) }))} />
              <span className="text-sm">AI Champion</span>
            </label>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={savingEdit || !editForm.fullName} className="gap-2">
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá tài khoản "{deleteTarget?.full_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xoá vĩnh viễn tài khoản đăng nhập và toàn bộ dữ liệu liên quan
              (bài nộp, tiến độ học, kế hoạch...). Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
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
              {deleting ? "Đang xoá..." : "Xoá tài khoản"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password confirm */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đặt lại mật khẩu cho "{resetTarget?.full_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Mật khẩu cũ sẽ ngừng hoạt động ngay lập tức. Mật khẩu mới sẽ được sinh ngẫu nhiên và chỉ hiển thị 1 lần.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={(e) => {
                e.preventDefault();
                handleResetPassword();
              }}
            >
              {resetting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password result */}
      <Dialog open={!!resetResult} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Đã đặt lại mật khẩu
            </DialogTitle>
          </DialogHeader>
          {resetResult && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Mật khẩu mới cho <strong>{resetResult.user.full_name}</strong> ({resetResult.user.email}):
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono">{resetResult.password}</div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigator.clipboard.writeText(resetResult.password)}
              >
                <Copy className="w-3 h-3" /> Sao chép
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => !open && closeImportDialog()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import danh sách người dùng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Cột: <code className="text-xs bg-gray-100 px-1 rounded">full_name,email,department,factory,role</code>
                {" "}(2 cột cuối không bắt buộc)
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  downloadText(
                    "mau-import-nguoi-dung.csv",
                    "full_name,email,department,factory,role\nNguyễn Văn A,nguyenvana@apfco.com.vn,market,apfco,student"
                  )
                }
              >
                <Download className="w-3 h-3" /> Tải file mẫu
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Chọn file CSV</Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFilePick(e.target.files[0])}
              />
              <span className="text-xs text-gray-400">hoặc dán nội dung CSV bên dưới</span>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder="full_name,email,department,factory,role"
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleParse} disabled={!csvText.trim()}>Xem trước</Button>
            </div>

            {parsedRows.length > 0 && importResults.length === 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phòng ban</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.fullName}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.department ? DEPARTMENTS[r.department] : "--"}</TableCell>
                        <TableCell>{ROLES[r.role ?? "student"]}</TableCell>
                        <TableCell>
                          {r.valid ? (
                            r.warnings.length > 0 ? (
                              <span className="flex items-center gap-1 text-xs text-yellow-600">
                                <AlertTriangle className="w-3 h-3" /> {r.warnings.join("; ")}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <XCircle className="w-3 h-3" /> {r.warnings.join("; ")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {parsedRows.length > 0 && importResults.length === 0 && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleImport}
                  disabled={importing || parsedRows.every((r) => !r.valid)}
                  className="gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing
                    ? `Đang import ${importProgress.done}/${importProgress.total}...`
                    : `Import ${parsedRows.filter((r) => r.valid).length} người dùng`}
                </Button>
                {parsedRows.some((r) => !r.valid) && (
                  <span className="text-xs text-gray-400">
                    {parsedRows.filter((r) => !r.valid).length} dòng lỗi sẽ bị bỏ qua
                  </span>
                )}
              </div>
            )}

            {importResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="text-green-600 font-medium">{importResults.filter((r) => r.success).length} thành công</span>
                    {" · "}
                    <span className="text-red-500 font-medium">{importResults.filter((r) => !r.success).length} lỗi</span>
                  </p>
                  <Button variant="outline" size="sm" className="gap-2" onClick={downloadImportResults}>
                    <Download className="w-3 h-3" /> Tải kết quả (kèm mật khẩu)
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Kết quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>
                            {r.success ? (
                              <span className="text-xs text-green-600">Đã tạo</span>
                            ) : (
                              <span className="text-xs text-red-500">{r.error}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-gray-400">
                  Mật khẩu chỉ hiển thị trong file tải về ở trên — hãy lưu lại trước khi đóng cửa sổ này.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={closeImportDialog}>Đóng</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
