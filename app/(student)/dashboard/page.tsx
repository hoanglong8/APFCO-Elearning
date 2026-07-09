import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ClipboardList, Star, Target, Trophy } from "lucide-react";
import { DEPARTMENTS, FACTORIES, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: modules }, { data: progress }, { data: submissions }, { data: assignments }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("modules").select("id, title, day_number, estimated_minutes").eq("is_published", true).order("order_index"),
      supabase.from("module_progress").select("*").eq("student_id", user.id),
      supabase.from("submissions").select("id, status, score, assignment_id").eq("student_id", user.id),
      supabase.from("assignments").select("id, title, due_date, max_score").eq("is_published", true),
    ]);

  const totalModules = modules?.length ?? 0;
  const completedModules = progress?.filter((p) => p.status === "completed").length ?? 0;
  const completionPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const gradedSubmissions = submissions?.filter((s) => s.status === "graded" && s.score !== null) ?? [];
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / gradedSubmissions.length)
    : null;

  const pendingAssignments = assignments?.filter(
    (a) => !submissions?.find((s) => s.assignment_id === a.id && s.status !== "draft")
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {profile?.full_name?.split(" ").pop()}!
          </h1>
          <p className="text-gray-500 mt-1">
            {profile?.department ? DEPARTMENTS[profile.department] : ""}{" "}
            {profile?.factory ? `· ${FACTORIES[profile.factory]}` : ""}
          </p>
        </div>
        {profile?.ai_champion && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <Trophy className="w-3 h-3" /> AI Champion
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedModules}/{totalModules}</p>
                <p className="text-xs text-gray-500">Module hoàn thành</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{submissions?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Bài đã nộp</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgScore ?? "--"}</p>
                <p className="text-xs text-gray-500">Điểm trung bình</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingAssignments.length}</p>
                <p className="text-xs text-gray-500">Bài chưa nộp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tiến độ tổng thể</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Hoàn thành khóa học</span>
              <span className="font-semibold">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-3" />
            <p className="text-xs text-gray-400">
              {completedModules} / {totalModules} modules
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Modules */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tài liệu học</CardTitle>
              <Link href="/modules">
                <Button variant="ghost" size="sm" className="text-green-600 h-7 text-xs">Xem tất cả</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {modules?.slice(0, 4).map((mod) => {
              const prog = progress?.find((p) => p.module_id === mod.id);
              const status = prog?.status ?? "not_started";
              return (
                <Link key={mod.id} href={`/modules/${mod.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      status === "completed" ? "bg-green-500" :
                      status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{mod.title}</p>
                      <p className="text-xs text-gray-400">
                        Ngày {mod.day_number} · {mod.estimated_minutes} phút
                      </p>
                    </div>
                    {status === "completed" && (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Xong</Badge>
                    )}
                  </div>
                </Link>
              );
            })}
            {(!modules || modules.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có tài liệu</p>
            )}
          </CardContent>
        </Card>

        {/* Pending assignments */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bài tập cần nộp</CardTitle>
              <Link href="/assignments">
                <Button variant="ghost" size="sm" className="text-green-600 h-7 text-xs">Xem tất cả</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAssignments.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/assignments/${a.id}/submit`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    {a.due_date && (
                      <p className="text-xs text-gray-400">Hạn: {formatDate(a.due_date)}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">{a.max_score}đ</Badge>
                </div>
              </Link>
            ))}
            {pendingAssignments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Bạn đã nộp tất cả bài tập!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
