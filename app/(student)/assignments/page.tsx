import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, ChevronRight, Paperclip } from "lucide-react";
import { formatDate, STATUS_LABELS } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  graded: "bg-green-50 text-green-700",
  returned: "bg-orange-50 text-orange-700",
  draft: "bg-gray-50 text-gray-500",
};

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("department").eq("id", user.id).single();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("is_published", true)
    .or(`department_tags.cs.{all},department_tags.cs.{${profile?.department ?? "all"}}`)
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", user.id);

  function getSubmission(assignmentId: string) {
    return submissions?.find((s) => s.assignment_id === assignmentId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bài tập</h1>
        <p className="text-gray-500 mt-1">{assignments?.length ?? 0} bài tập được giao</p>
      </div>

      <div className="space-y-3">
        {assignments?.map((assignment) => {
          const sub = getSubmission(assignment.id);
          const status = sub?.status ?? "pending";
          return (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {assignment.title}
                        {assignment.attachment_url && (
                          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sub?.is_late && (
                          <Badge className="text-xs border-0 bg-amber-50 text-amber-700">Nộp muộn</Badge>
                        )}
                        <Badge className={`text-xs border-0 ${
                          sub ? (statusBadge[sub.status] ?? "bg-gray-50 text-gray-500") : "bg-orange-50 text-orange-700"
                        }`}>
                          {sub ? STATUS_LABELS[sub.status] : "Chưa nộp"}
                        </Badge>
                      </div>
                    </div>
                    {assignment.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {assignment.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Hạn: {formatDate(assignment.due_date)}
                        </span>
                      )}
                      <span>Tối đa: {assignment.max_score} điểm</span>
                      {sub?.score !== null && sub?.score !== undefined && (
                        <span className="text-green-700 font-semibold">Điểm: {sub.score}/{assignment.max_score}</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/assignments/${assignment.id}/submit`}>
                    <Button variant={sub?.status === "graded" ? "outline" : "default"} size="sm" className="gap-1 flex-shrink-0">
                      {sub?.status === "graded" ? "Xem kết quả" : sub ? "Xem bài" : "Nộp bài"}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!assignments || assignments.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có bài tập nào được giao</p>
          </div>
        )}
      </div>
    </div>
  );
}
