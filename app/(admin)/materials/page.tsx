import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Plus } from "lucide-react";
import { MaterialUploader } from "@/components/admin/MaterialUploader";
import { formatDate } from "@/lib/utils";

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

  const typeColor: Record<string, string> = {
    slide: "bg-blue-50 text-blue-700",
    pdf: "bg-red-50 text-red-700",
    video: "bg-purple-50 text-purple-700",
    prompt: "bg-green-50 text-green-700",
    link: "bg-orange-50 text-orange-700",
  };

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
          <div className="space-y-2">
            {materials?.map((mat) => {
              const url = mat.file_url ?? mat.external_url;
              const mod = (mat as any).modules;
              return (
                <div key={mat.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{mat.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-xs border-0 ${typeColor[mat.material_type] ?? "bg-gray-50 text-gray-600"}`}>
                        {mat.material_type}
                      </Badge>
                      {mod && <span className="text-xs text-gray-400">{mod.title}</span>}
                    </div>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1 h-8">
                        {mat.file_url ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
            {(!materials || materials.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có tài liệu nào</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
