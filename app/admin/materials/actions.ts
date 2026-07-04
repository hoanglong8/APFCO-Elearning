"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Tạo signed upload URL để client upload thẳng file lên Supabase Storage.
// Dùng service role (bỏ qua storage RLS) nhưng CHỈ cấp URL sau khi xác minh
// người gọi là nhân viên (admin/trainer/director). Upload đi trực tiếp
// browser -> Supabase nên không dính giới hạn dung lượng của Vercel.
export async function createMaterialUploadUrl(path: string) {
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

  if (!profile || !["admin", "trainer", "director"].includes(profile.role)) {
    throw new Error("Bạn không có quyền upload tài liệu.");
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await service.storage
    .from("materials")
    .createSignedUploadUrl(path);

  if (error) throw new Error(error.message);
  return data; // { signedUrl, token, path }
}
