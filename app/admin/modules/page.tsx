import { createClient } from "@/lib/supabase/server";
import { ModuleManager } from "@/components/admin/ModuleManager";

export default async function AdminModulesPage() {
  const supabase = await createClient();

  const [{ data: modules }, { data: materials }] = await Promise.all([
    supabase.from("modules").select("*").order("day_number").order("order_index"),
    supabase.from("materials").select("id, module_id"),
  ]);

  const materialCounts = (materials ?? []).reduce((acc, m) => {
    acc[m.module_id] = (acc[m.module_id] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Module</h1>
        <p className="text-gray-500 mt-1">{modules?.length ?? 0} module đào tạo</p>
      </div>

      <ModuleManager modules={modules ?? []} materialCounts={materialCounts} />
    </div>
  );
}
