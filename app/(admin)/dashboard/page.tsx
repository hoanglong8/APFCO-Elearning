import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, ClipboardList, Star, Trophy, TrendingUp } from "lucide-react";
import { DEPARTMENTS } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { data: profiles, count: totalStudents },
    { data: modules },
    { data: allProgress },
    { data: submissions },
    { data: actionPlans },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact" }).eq("role", "student"),
    supabase.from("modules").select("id").eq("is_published", true),
    supabase.from("module_progress").select("*"),
    supabase.from("submissions").select("status, score, student_id"),
    supabase.from("action_plans").select("committed, completed_use_cases, use_cases"),
  ]);

  const totalModules = modules?.length ?? 0;
  const completedCount = allProgress?.filter((p) => p.status === "completed").length ?? 0;
  const completionRate = totalStudents && totalModules
    ? Math.round((completedCount / (totalStudents * totalModules)) * 100) : 0;

  const gradedSubs = submissions?.filter((s) => s.score !== null) ?? [];
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / gradedSubs.length) : 0;

  const pendingSubs = submissions?.filter((s) => s.status === "submitted").length ?? 0;
  const committedPlans = actionPlans?.filter((p) => p.committed).length ?? 0;
  const champions = profiles?.filter((p) => p.ai_champion) ?? [];

  // Dept breakdown
  const deptStats = Object.entries(DEPARTMENTS).map(([key, label]) => {
    const deptProfiles = profiles?.filter((p) => p.department === key) ?? [];
    const deptProgress = allProgress?.filter((p) =>
      deptProfiles.some((prof) => prof.id === p.student_id)
    ) ?? [];
    const deptCompleted = deptProgress.filter((p) => p.status === "completed").length;
    const deptTotal = deptProfiles.length * totalModules;
    const pct = deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0;
    return { key, label, count: deptProfiles.length, pct };
  }).filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
        <p className="text-gray-500 mt-1">Tổng quan tiến độ đào tạo APFCO</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Học viên", value: totalStudents ?? 0, icon: Users, color: "blue" },
          { label: "Tỷ lệ hoàn thành", value: `${completionRate}%`, icon: BookOpen, color: "green" },
          { label: "Chờ chấm bài", value: pendingSubs, icon: ClipboardList, color: "orange" },
          { label: "Điểm trung bình", value: avgScore || "--", icon: Star, color: "purple" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${kpi.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 text-${kpi.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dept progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Tiến độ theo bộ phận
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deptStats.map((d) => (
              <div key={d.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{d.label} ({d.count} người)</span>
                  <span className={`font-semibold ${d.pct >= 80 ? "text-green-600" : d.pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                    {d.pct}%
                  </span>
                </div>
                <Progress value={d.pct} className="h-2" />
              </div>
            ))}
            {deptStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
          </CardContent>
        </Card>

        {/* Champions & Plans */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> AI Champions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {champions.length > 0 ? (
                <div className="space-y-2">
                  {champions.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                      <div className="w-7 h-7 bg-yellow-200 rounded-full flex items-center justify-center">
                        <span className="text-yellow-800 font-bold text-xs">{c.full_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.full_name}</p>
                        <p className="text-xs text-gray-400">{c.department ? DEPARTMENTS[c.department] : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có AI Champion</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kế hoạch 2 tuần</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{actionPlans?.length ?? 0}</p>
                  <p className="text-xs text-gray-500">Đã lập kế hoạch</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{committedPlans}</p>
                  <p className="text-xs text-gray-500">Đã cam kết</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
