"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Chỉ "admin" (không phải trainer/director) mới được quản lý người dùng —
// đổi role/tạo tài khoản là hành động có thể leo thang đặc quyền, nên kiểm
// tra lại phía server thay vì tin vào UI hoặc RLS mở cho toàn bộ staff.
async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn chưa đăng nhập.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Chỉ Admin mới có quyền quản lý người dùng.");
  }
  return user;
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function generatePassword(length = 12) {
  // Bỏ các ký tự dễ nhầm lẫn khi đọc/gõ lại thủ công (I, l, 1, O, 0).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export interface NewUserInput {
  email: string;
  fullName: string;
  department?: string | null;
  factory?: string | null;
  role?: string;
}

export interface CreateUserResult {
  success: boolean;
  email: string;
  fullName: string;
  password?: string;
  error?: string;
}

async function createOneUser(
  service: ReturnType<typeof serviceClient>,
  input: NewUserInput
): Promise<CreateUserResult> {
  const password = generatePassword();

  const { data, error } = await service.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error || !data.user) {
    return { success: false, email: input.email, fullName: input.fullName, error: error?.message ?? "Không tạo được tài khoản" };
  }

  // Trigger handle_new_user() đã tự tạo profiles row với role mặc định 'student';
  // cập nhật lại cho đúng thông tin admin nhập.
  const { error: profileErr } = await service
    .from("profiles")
    .update({
      full_name: input.fullName,
      department: input.department || null,
      factory: input.factory || null,
      role: input.role || "student",
    })
    .eq("id", data.user.id);

  if (profileErr) {
    return { success: false, email: input.email, fullName: input.fullName, error: profileErr.message };
  }

  return { success: true, email: input.email, fullName: input.fullName, password };
}

export async function createUserAction(input: NewUserInput): Promise<CreateUserResult> {
  await requireAdmin();
  if (!input.email || !input.fullName) {
    return { success: false, email: input.email, fullName: input.fullName, error: "Thiếu email hoặc họ tên." };
  }
  return createOneUser(serviceClient(), input);
}

export async function importUsersAction(rows: NewUserInput[]): Promise<CreateUserResult[]> {
  await requireAdmin();
  const service = serviceClient();
  const results: CreateUserResult[] = [];
  for (const row of rows) {
    results.push(await createOneUser(service, row));
  }
  return results;
}

export interface UpdateUserInput {
  id: string;
  fullName: string;
  department?: string | null;
  factory?: string | null;
  role: string;
  aiChampion: boolean;
}

export async function updateUserAction(input: UpdateUserInput) {
  await requireAdmin();
  const service = serviceClient();
  const { error } = await service
    .from("profiles")
    .update({
      full_name: input.fullName,
      department: input.department || null,
      factory: input.factory || null,
      role: input.role,
      ai_champion: input.aiChampion,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

export async function deleteUserAction(id: string) {
  const admin = await requireAdmin();
  if (admin.id === id) throw new Error("Bạn không thể tự xoá tài khoản của chính mình.");
  const service = serviceClient();
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
}

export async function resetPasswordAction(id: string): Promise<{ password: string }> {
  await requireAdmin();
  const service = serviceClient();
  const password = generatePassword();
  const { error } = await service.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
  return { password };
}
