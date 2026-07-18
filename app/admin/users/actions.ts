"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendActivationEmail } from "@/lib/email";

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

// Giới hạn tối thiểu của Supabase Auth là 6 ký tự.
function isValidPassword(password: string) {
  return password.length >= 6;
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
  action?: "created" | "updated";
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

  return { success: true, email: input.email, fullName: input.fullName, password, action: "created" };
}

export async function createUserAction(input: NewUserInput): Promise<CreateUserResult> {
  await requireAdmin();
  if (!input.email || !input.fullName) {
    return { success: false, email: input.email, fullName: input.fullName, error: "Thiếu email hoặc họ tên." };
  }
  return createOneUser(serviceClient(), input);
}

// Nếu email đã tồn tại, cập nhật họ tên/phòng ban/nhà máy/role thay vì báo
// lỗi trùng — cho phép dùng cùng file import để vừa tạo user mới vừa đồng
// bộ lại thông tin cho user đã có, không cần tách 2 luồng riêng.
async function updateOneUserByEmail(
  service: ReturnType<typeof serviceClient>,
  profileId: string,
  input: NewUserInput
): Promise<CreateUserResult> {
  const { error } = await service
    .from("profiles")
    .update({
      full_name: input.fullName,
      department: input.department || null,
      factory: input.factory || null,
      role: input.role || "student",
    })
    .eq("id", profileId);

  if (error) {
    return { success: false, email: input.email, fullName: input.fullName, action: "updated", error: error.message };
  }
  return { success: true, email: input.email, fullName: input.fullName, action: "updated" };
}

export async function importUsersAction(rows: NewUserInput[]): Promise<CreateUserResult[]> {
  await requireAdmin();
  const service = serviceClient();
  const results: CreateUserResult[] = [];
  for (const row of rows) {
    const { data: existing } = await service
      .from("profiles")
      .select("id")
      .ilike("email", row.email)
      .maybeSingle();

    results.push(
      existing ? await updateOneUserByEmail(service, existing.id, row) : await createOneUser(service, row)
    );
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

export async function resetPasswordAction(id: string, customPassword?: string): Promise<{ password: string }> {
  await requireAdmin();
  if (customPassword && !isValidPassword(customPassword)) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
  }
  const service = serviceClient();
  const password = customPassword || generatePassword();
  const { error } = await service.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
  return { password };
}

export interface BulkActivateResult {
  id: string;
  email: string;
  fullName: string;
  passwordReset: boolean;
  emailSent: boolean;
  emailSkipped?: boolean;
  password?: string;
  error?: string;
}

export interface BulkActivateOptions {
  // Mật khẩu mặc định áp dụng cho toàn bộ tài khoản đã chọn. Bỏ trống = mỗi
  // tài khoản được sinh một mật khẩu ngẫu nhiên riêng như trước.
  password?: string;
  // Tắt để chỉ đặt lại mật khẩu mà không gửi email — dùng khi admin muốn tự
  // thông báo mật khẩu mặc định trực tiếp thay vì phụ thuộc vào email.
  sendEmail?: boolean;
}

async function activateOneUser(
  service: ReturnType<typeof serviceClient>,
  id: string,
  overridePassword: string | undefined,
  sendEmail: boolean
): Promise<BulkActivateResult> {
  const { data: profile } = await service
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .single();

  if (!profile) {
    return { id, email: "", fullName: "", passwordReset: false, emailSent: false, error: "Không tìm thấy người dùng." };
  }

  const password = overridePassword || generatePassword();
  const { error: pwErr } = await service.auth.admin.updateUserById(id, { password });
  if (pwErr) {
    return { id, email: profile.email, fullName: profile.full_name, passwordReset: false, emailSent: false, error: pwErr.message };
  }

  if (!sendEmail) {
    return { id, email: profile.email, fullName: profile.full_name, passwordReset: true, emailSent: false, emailSkipped: true, password };
  }

  const emailResult = await sendActivationEmail({ to: profile.email, fullName: profile.full_name, password });

  return {
    id,
    email: profile.email,
    fullName: profile.full_name,
    passwordReset: true,
    emailSent: emailResult.success,
    password,
    error: emailResult.success ? undefined : emailResult.error,
  };
}

// Đặt lại mật khẩu (ngẫu nhiên hoặc mặc định do admin chọn) và tuỳ chọn gửi
// email cho từng người dùng đã chọn. Xử lý tuần tự (không Promise.all) để
// không vượt giới hạn tần suất gửi của Resend.
export async function bulkActivateUsersAction(
  ids: string[],
  options?: BulkActivateOptions
): Promise<BulkActivateResult[]> {
  await requireAdmin();
  if (options?.password && !isValidPassword(options.password)) {
    throw new Error("Mật khẩu mặc định phải có ít nhất 6 ký tự.");
  }
  const service = serviceClient();
  const sendEmail = options?.sendEmail ?? true;
  const results: BulkActivateResult[] = [];
  for (const id of ids) {
    results.push(await activateOneUser(service, id, options?.password, sendEmail));
  }
  return results;
}
