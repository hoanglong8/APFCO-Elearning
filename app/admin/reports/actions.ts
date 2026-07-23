"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Chỉ "admin" mới được đặt AI Champion — cùng mức quyền với chỉnh sửa hồ sơ
// người dùng khác (ai_champion là 1 field trên profiles, đổi bởi admin qua
// UserManager trước đây; giữ nguyên mức quyền đó cho action mới này).
async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bạn chưa đăng nhập.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    throw new Error("Chỉ Admin mới có quyền đặt AI Champion.");
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

// Đặt LẠI TOÀN BỘ danh sách AI Champion theo đúng selectedIds — ai không có
// trong danh sách sẽ bị gỡ badge (kể cả đang là champion), không phải kiểu
// "chỉ thêm". Admin thấy rõ điều này qua ghi chú ở UI trước khi lưu.
export async function setAIChampionsAction(selectedIds: string[]): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const service = serviceClient();

  const { data: allStudents, error: fetchErr } = await service.from("profiles").select("id").eq("role", "student");
  if (fetchErr) return { success: false, error: fetchErr.message };

  const selectedSet = new Set(selectedIds);
  const allIds = (allStudents ?? []).map((p) => p.id);
  const toUnset = allIds.filter((id) => !selectedSet.has(id));

  if (selectedIds.length > 0) {
    const { error } = await service.from("profiles").update({ ai_champion: true }).in("id", selectedIds);
    if (error) return { success: false, error: error.message };
  }
  if (toUnset.length > 0) {
    const { error } = await service.from("profiles").update({ ai_champion: false }).in("id", toUnset);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}
