import { createClient } from "@/lib/supabase/server";
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

  const assignmentRows = (assignments ?? []).map((a) => {
    const subs = submissionCounts?.filter((s) => s.assignment_id === a.id) ?? [];
    return {
      ...a,
      submissionTotal: subs.length,
      submissionPending: subs.filter((s) => s.status === "submitted").length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Bài tập</h1>
          <p className="text-gray-500 mt-1">{assignments?.length ?? 0} bài tập</p>
        </div>
      </div>

      <AssignmentManager assignments={assignmentRows as any} modules={modules ?? []} creatorId={user?.id ?? ""} />
    </div>
  );
}
