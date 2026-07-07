import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Star, Trophy, Target, TrendingUp } from "lucide-react";
import { DEPARTMENTS, FACTORIES } from "@/lib/utils";
import { StudentProgressTable, type StudentProgressRow } from "@/components/admin/StudentProgressTable";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: modules },
    { data: allProgress },
    { data: submissions },
    { data: actionPlans },
    { data: practiceLogs },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student"),
    supabase.from("modules").select("id, title, day_number").eq("is_published", true),
    supabase.from("module_progress").select("*"),
    supabase.from("submissions").select("*, assignments(max_score)"),
    supabase.from("action_plans").select("*"),
    supabase.from("practice_logs").select("id, tool_used, self_rating, student_id, created_at"),
  ]);

  const totalStudents = profiles?.length ?? 0;
  const totalModules = modules?.length ?? 0;

  // Completion stats
  const completedPairs = allProgress?.filter((p) => p.status === "completed") ?? [];
  const overallCompletionRate = totalStudents * totalModules > 0
    ? Math.round((completedPairs.length / (totalStudents * totalModules)) * 100) : 0;

  // Score stats
  const gradedSubs = submissions?.filter((s) => s.score !== null) ?? [];
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / gradedSubs.length) : 0;

  // Champions
  const champions = profiles?.filter((p) => p.ai_champion) ?? [];

  // Department breakdown
  const deptStats = Object.entries(DEPARTMENTS).map(([key, label]) => {
    const deptProfiles = profiles?.filter((p) => p.department === key) ?? [];
    const deptProgress = allProgress?.filter((p) =>
      deptProfiles.some((prof) => prof.id === p.student_id) && p.status === "completed"
    ) ?? [];
    const deptSubs = gradedSubs.filter((s) =>
      deptProfiles.some((prof) => prof.id === s.student_id)
    );
    const deptAvgScore = deptSubs.length > 0
      ? Math.round(deptSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / deptSubs.length) : null;
    const deptTotal = deptProfiles.length * totalModules;
    const pct = deptTotal > 0 ? Math.round((deptProgress.length / deptTotal) * 100) : 0;
    return { key, label, count: deptProfiles.length, pct, avgScore: deptAvgScore };
  }).filter((d) => d.count > 0);

  // Tool usage
  const toolUsage = practiceLogs?.reduce((acc, log) => {
    const t = log.tool_used ?? "other";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Factory stats
  const factoryStats = Object.entries(FACTORIES).map(([key, label]) => {
    const factProfiles = profiles?.filter((p) => p.factory === key) ?? [];
    const factCompleted = allProgress?.filter((p) =>
      factProfiles.some((prof) => prof.id === p.student_id) && p.status === "completed"
    ).length ?? 0;
    const factTotal = factProfiles.length * totalModules;
    return { key, label, count: factProfiles.length, pct: factTotal > 0 ? Math.round((factCompleted / factTotal) * 100) : 0 };
  }).filter((f) => f.count > 0);

  // ROI estimate: avg 1.5h/week saved per use case
  const totalUseCases = actionPlans?.reduce((sum, p) => sum + ((p.use_cases as any[])?.length ?? 0), 0) ?? 0;
  const estimatedHoursPerWeek = Math.round(totalUseCases * 1.5);

  // Per-student progress table
  const studentRows: StudentProgressRow[] = (profiles ?? [])
    .map((p) => {
      const pProgress = allProgress?.filter((pr) => pr.student_id === p.id) ?? [];
      const completed = pProgress.filter((pr) => pr.status === "completed").length;
      const pct = totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0;

      const pSubs = submissions?.filter((s) => s.student_id === p.id) ?? [];
      const pGraded = pSubs.filter((s) => s.score !== null);
      const avgScore = pGraded.length > 0
        ? Math.round(pGraded.reduce((sum, s) => sum + (s.score ?? 0), 0) / pGraded.length)
        : null;

      const pLogs = practiceLogs?.filter((l) => l.student_id === p.id) ?? [];
      const activityDates = [
        ...pProgress.map((pr) => pr.completed_at),
        ...pSubs.map((s) => s.created_at),
        ...pLogs.map((l) => l.created_at),
      ].filter((d): d is string => Boolean(d));
      const lastActivity = activityDates.length > 0
        ? activityDates.reduce((a, b) => (a > b ? a : b))
        : null;

      return {
        id: p.id,
        fullName: p.full_name,
        department: p.department ? (DEPARTMENTS[p.department] ?? p.department) : "--",
        factory: p.factory ? (FACTORIES[p.factory] ?? p.factory) : "--",
        completedModules: completed,
        totalModules,
        pct,
        avgScore,
        submissionsCount: pSubs.length,
        aiChampion: Boolean(p.ai_champion),
        lastActivity,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo Kết quả Đào tạo</h1>
          <p className="text-gray-500 mt-1">APFCO AI Training – Tổng kết toàn khóa</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Học viên", value: totalStudents, icon: Users, color: "blue", sub: "tham gia" },
          { label: "Hoàn thành TB", value: `${overallCompletionRate}%`, icon: BookOpen, color: "green", sub: "tỷ lệ" },
          { label: "Điểm TB", value: avgScore || "--", icon: Star, color: "purple", sub: "/ 100" },
          { label: "AI Champions", value: champions.length, icon: Trophy, color: "yellow", sub: "được đề cử" },
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
                    <p className="text-xs text-gray-500">{kpi.sub} {kpi.label.toLowerCase()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dept breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Kết quả theo Bộ phận
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deptStats.map((d) => (
              <div key={d.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{d.label} <span className="text-gray-400">({d.count})</span></span>
                  <div className="flex items-center gap-3">
                    {d.avgScore !== null && (
                      <span className="text-xs text-purple-600">TB: {d.avgScore}đ</span>
                    )}
                    <span className={`font-semibold ${d.pct >= 80 ? "text-green-600" : d.pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                      {d.pct}%
                    </span>
                  </div>
                </div>
                <Progress value={d.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Factory breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kết quả theo Nhà máy / Đơn vị</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {factoryStats.map((f) => (
              <div key={f.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{f.label} <span className="text-gray-400">({f.count})</span></span>
                  <span className={`font-semibold ${f.pct >= 80 ? "text-green-600" : f.pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                    {f.pct}%
                  </span>
                </div>
                <Progress value={f.pct} className="h-2" />
              </div>
            ))}
            {factoryStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tool usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Công cụ AI được dùng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(toolUsage).sort(([, a], [, b]) => b - a).map(([tool, count]) => (
              <div key={tool} className="flex items-center justify-between">
                <span className="text-sm capitalize">{tool}</span>
                <div className="flex items-center gap-2">
                  <Progress value={(count / (practiceLogs?.length ?? 1)) * 100} className="h-2 w-24" />
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(toolUsage).length === 0 && <p className="text-sm text-gray-400">Chưa có log</p>}
          </CardContent>
        </Card>

        {/* ROI estimate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" /> Ước tính ROI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-bold text-blue-600">{estimatedHoursPerWeek}h</p>
              <p className="text-sm text-gray-500 mt-1">tiết kiệm / tuần (ước tính)</p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Tổng use case cam kết</span>
                <strong>{totalUseCases}</strong>
              </div>
              <div className="flex justify-between">
                <span>TB 1.5h tiết kiệm / use case</span>
                <strong>× 1.5h</strong>
              </div>
              <div className="flex justify-between">
                <span>KH cam kết</span>
                <strong>{actionPlans?.filter((p) => p.committed).length ?? 0}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Champions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> AI Champions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {champions.length > 0 ? (
              champions.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-800 font-bold text-sm">{c.full_name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.department ? DEPARTMENTS[c.department] : ""}</p>
                  </div>
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-0">Champion</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có AI Champion</p>
            )}
          </CardContent>
        </Card>
      </div>

      <StudentProgressTable rows={studentRows} />
    </div>
  );
}
