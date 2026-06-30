import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/admin/dashboard");
  if (["admin", "trainer", "director"].includes(profile.role ?? "")) redirect("/admin/dashboard");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
