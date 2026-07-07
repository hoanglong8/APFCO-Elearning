import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserManager } from "@/components/admin/UserManager";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin/dashboard");

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Người dùng</h1>
        <p className="text-gray-500 mt-1">{users?.length ?? 0} tài khoản</p>
      </div>

      <UserManager users={users ?? []} currentUserId={user.id} />
    </div>
  );
}
