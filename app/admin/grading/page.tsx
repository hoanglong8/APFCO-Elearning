import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, ChevronRight } from "lucide-react";
import { formatDateTime, STATUS_LABELS } from "@/lib/utils";

export default async function GradingPage() {
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, profiles(full_name, department), assignments(title, max_score)")
    .order("created_at", { ascending: true });

  const pending = submissions?.filter((s) => s.status === "submitted") ?? [];
  const graded = submissions?.filter((s) => s.status === "graded") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chấm bài</h1>
          <p className="text-gray-500 mt-1">{pending.length} bài đang chờ chấm</p>
        </div>
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
        </TabsList>

        {[
          { key: "pending", data: pending },
          { key: "graded", data: graded },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-3">
            {data.map((sub) => {
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
                            {sub.status === "graded" && sub.score !== null && (
                              <span className="font-bold text-green-700">{sub.score}/{assignment?.max_score}</span>
                            )}
                            <Badge className={`text-xs border-0 ${
                              sub.status === "submitted" ? "bg-orange-50 text-orange-700" :
                              "bg-green-50 text-green-700"
                            }`}>
                              {STATUS_LABELS[sub.status]}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Nộp: {formatDateTime(sub.created_at)}</p>
                      </div>
                      <Link href={`/admin/grading/${sub.id}`}>
                        <Button size="sm" variant={key === "pending" ? "default" : "outline"} className="gap-1">
                          {key === "pending" ? "Chấm bài" : "Xem lại"}
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {data.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{key === "pending" ? "Không có bài nào chờ chấm" : "Chưa có bài nào được chấm"}</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
