import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialUploader } from "@/components/admin/MaterialUploader";
import { MaterialTable } from "@/components/admin/MaterialTable";

export default async function MaterialsPage() {
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, day_number")
    .order("day_number")
    .order("order_index");

  const { data: materials } = await supabase
    .from("materials")
    .select("*, modules(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài liệu</h1>
          <p className="text-gray-500 mt-1">{materials?.length ?? 0} tài liệu</p>
        </div>
      </div>

      <MaterialUploader modules={modules ?? []} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Danh sách tài liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialTable materials={(materials ?? []) as any} modules={modules ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
