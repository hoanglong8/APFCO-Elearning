import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, ChevronRight } from "lucide-react";
import { formatDateTime, STATUS_LABELS } from "@/lib/utils";
import { GradingFilter } from "@/components/admin/GradingFilter";
import { PendingSubmissionsList } from "@/components/admin/PendingSubmissionsList";
import { GradedSubmissionsList } from "@/components/admin/GradedSubmissionsList";

const statusColor: Record<string, string> = {
  submitted: "bg-orange-50 text-orange-700",
  graded: "bg-green-50 text-green-700",
  returned: "bg-red-50 text-red-700",
};

export default async function GradingPage({
  searchParams,
}: {
  searchParams: { assignment?: string };
}) {
  const supabase = await createClient();

  const [{ data: submissions }, { data: assignments }] = await Promise.all([
    supabase
      .from("submissions")
      .select("*, profiles!submissions_student_id_fkey(full_name, department), assignments(title, max_score)")
      .order("created_at", { ascending: true }),
    supabase.from("assignments").select("id, title").order("created_at", { ascending: false }),
  ]);

  const assignmentFilter = searchParams.assignment;
  const filtered = assignmentFilter
    ? submissions?.filter((s) => s.assignment_id === assignmentFilter)
    : submissions;

  const pending = filtered?.filter((s) => s.status === "submitted") ?? [];
  const graded = filtered?.filter((s) => s.status === "graded") ?? [];
  const returned = filtered?.filter((s) => s.status === "returned") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chấm bài</h1>
          <p className="text-gray-500 mt-1">{pending.length} bài đang chờ chấm</p>
        </div>
        <GradingFilter assignments={assignments ?? []} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Chờ chấm
            {pending.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="graded">Đã chấm ({graded.length})</TabsTrigger>
          <TabsTrigger value="returned">
            Yêu cầu nộp lại
            {returned.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {returned.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingSubmissionsList submissions={pending} />
        </TabsContent>

        <TabsContent value="graded" className="mt-4">
          <GradedSubmissionsList submissions={graded} />
        </TabsContent>

        <TabsContent value="returned" className="mt-4 space-y-3">
          {returned.map((sub) => {
            const profile = (sub as any).profiles;
            const assignment = (sub as any).assignments;
            return (
              <Card key={sub.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{profile?.full_name ?? "Học viên"}</p>
                          <p className="text-sm text-gray-500">{assignment?.title ?? "Bài tập"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(sub as any).is_late && (
                            <Badge className="text-xs border-0 bg-amber-50 text-amber-700">Nộp muộn</Badge>
                          )}
                          <Badge className={`text-xs border-0 ${statusColor[sub.status] ?? "bg-gray-50 text-gray-600"}`}>
                            {STATUS_LABELS[sub.status]}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Nộp: {formatDateTime((sub as any).submitted_at ?? sub.created_at)}</p>
                    </div>
                    <Link href={`/admin/grading/${sub.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        Xem lại <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {returned.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Không có bài nào yêu cầu nộp lại</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
