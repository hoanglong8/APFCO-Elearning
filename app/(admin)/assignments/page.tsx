import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AssignmentManager } from "@/components/admin/AssignmentManager";

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: assignments }, { data: modules }] = await Promise.all([
    supabase.from("assignments").select("*, profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("modules").select("id, title, day_number").order("day_number").order("order_index"),
  ]);

  const { data: submissionCounts } = await supabase
    .from("submissions")
    .select("assignment_id, status");

  function getCounts(id: string) {
    const subs = submissionCounts?.filter((s) => s.assignment_id === id) ?? [];
    return {
      total: subs.length,
      pending: subs.filter((s) => s.status === "submitted").length,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Bài tập</h1>
          <p className="text-gray-500 mt-1">{assignments?.length ?? 0} bài tập</p>
        </div>
      </div>

      <AssignmentManager modules={modules ?? []} creatorId={user?.id ?? ""} />

      <div className="space-y-3">
        {assignments?.map((a) => {
          const counts = getCounts(a.id);
          return (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{a.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={a.is_published ? "default" : "secondary"} className="text-xs">
                          {a.is_published ? "Đã publish" : "Nháp"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{a.max_score} điểm</span>
                      {a.due_date && <span>Hạn: {formatDate(a.due_date)}</span>}
                      <span>{counts.total} bài nộp</span>
                      {counts.pending > 0 && (
                        <span className="text-orange-600 font-medium">{counts.pending} chờ chấm</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!assignments || assignments.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có bài tập nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
