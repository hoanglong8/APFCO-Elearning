import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Star, Trophy, Target, TrendingUp } from "lucide-react";
import { DEPARTMENTS, FACTORIES } from "@/lib/utils";
import { StudentProgressTable, type StudentProgressRow, type GradebookData } from "@/components/admin/StudentProgressTable";
import { AssignmentMultiFilter } from "@/components/admin/AssignmentMultiFilter";

type SubmissionBucket = "graded" | "pending" | "returned" | "notSubmitted";

function classifySubmission(sub: { status: string } | undefined): SubmissionBucket {
  if (!sub || sub.status === "draft") return "notSubmitted";
  if (sub.status === "graded") return "graded";
  if (sub.status === "returned") return "returned";
  return "pending"; // submitted, chờ chấm
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { assignments?: string };
}) {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: modules },
    { data: allProgress },
    { data: submissions },
    { data: actionPlans },
    { data: practiceLogs },
    { data: publishedAssignments },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student"),
    supabase.from("modules").select("id, title, day_number").eq("is_published", true),
    supabase.from("module_progress").select("*"),
    supabase.from("submissions").select("*, assignments(max_score)"),
    supabase.from("action_plans").select("*"),
    supabase.from("practice_logs").select("id, student_id, created_at"),
    supabase.from("assignments").select("id, title, max_score").eq("is_published", true).order("created_at"),
  ]);

  const totalStudents = profiles?.length ?? 0;
  const totalModules = modules?.length ?? 0;
  const assignmentList = publishedAssignments ?? [];

  // Bộ lọc "tích chọn theo bài tập" — không có param nghĩa là chọn tất cả (không lọc).
  const selectedAssignmentIds = searchParams.assignments
    ? searchParams.assignments.split(",").filter(Boolean)
    : assignmentList.map((a) => a.id);
  // Guard: nếu bỏ chọn hết (0 bài), coi như không lọc để tránh báo cáo trống khó hiểu.
  const effectiveAssignmentIds = selectedAssignmentIds.length > 0 ? selectedAssignmentIds : assignmentList.map((a) => a.id);

  // Completion stats (module, dùng cho KPI "Hoàn thành TB")
  const completedPairs = allProgress?.filter((p) => p.status === "completed") ?? [];
  const overallCompletionRate = totalStudents * totalModules > 0
    ? Math.round((completedPairs.length / (totalStudents * totalModules)) * 100) : 0;

  // Score stats
  const gradedSubs = submissions?.filter((s) => s.score !== null) ?? [];
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / gradedSubs.length) : 0;

  // Champions
  const champions = profiles?.filter((p) => p.ai_champion) ?? [];

  // Học viên đã viết kế hoạch 2 tuần (có bản ghi action_plans)
  const studentsWithPlan = new Set((actionPlans ?? []).map((p) => p.student_id));

  // Index submissions theo student+assignment để tra cứu O(1) khi tính báo cáo theo bộ phận/nhà máy.
  const submissionByKey = new Map<string, { status: string; score: number | null }>();
  submissions?.forEach((s) => submissionByKey.set(`${s.student_id}_${s.assignment_id}`, s));

  function computeGroupStats(dict: Record<string, string>, keyField: "department" | "factory") {
    return Object.entries(dict)
      .map(([key, label]) => {
        const groupProfiles = profiles?.filter((p) => (p as any)[keyField] === key) ?? [];
        if (groupProfiles.length === 0) return null;

        let graded = 0, pending = 0, returned = 0, notSubmitted = 0;
        const gradedScores: number[] = [];

        for (const student of groupProfiles) {
          for (const assignmentId of effectiveAssignmentIds) {
            const sub = submissionByKey.get(`${student.id}_${assignmentId}`);
            const bucket = classifySubmission(sub);
            if (bucket === "graded") {
              graded++;
              if (sub?.score != null) gradedScores.push(sub.score);
            } else if (bucket === "pending") pending++;
            else if (bucket === "returned") returned++;
            else notSubmitted++;
          }
        }

        const total = groupProfiles.length * effectiveAssignmentIds.length;
        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

        return {
          key,
          label,
          count: groupProfiles.length,
          graded, gradedPct: pct(graded),
          pending, pendingPct: pct(pending),
          returned, returnedPct: pct(returned),
          notSubmitted, notSubmittedPct: pct(notSubmitted),
          avgScore: gradedScores.length > 0
            ? Math.round(gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) : null,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }

  const deptStats = computeGroupStats(DEPARTMENTS, "department");
  const factoryStats = computeGroupStats(FACTORIES, "factory");

  // ROI estimate: avg 1.5h/week saved per use case
  const totalUseCases = actionPlans?.reduce((sum, p) => sum + ((p.use_cases as any[])?.length ?? 0), 0) ?? 0;
  const estimatedHoursPerWeek = Math.round(totalUseCases * 1.5);

  // Per-student progress table
  const studentRows: StudentProgressRow[] = (profiles ?? []).map((p) => {
    const pSubs = submissions?.filter((s) => s.student_id === p.id) ?? [];
    const pGraded = pSubs.filter((s) => s.score !== null);
    const avgScoreStudent = pGraded.length > 0
      ? Math.round(pGraded.reduce((sum, s) => sum + (s.score ?? 0), 0) / pGraded.length)
      : null;
    const submittedCount = pSubs.filter((s) => s.status !== "draft").length;

    const pProgress = allProgress?.filter((pr) => pr.student_id === p.id) ?? [];
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
      hasPlan: studentsWithPlan.has(p.id),
      avgScore: avgScoreStudent,
      submittedCount,
      totalAssignments: assignmentList.length,
      aiChampion: Boolean(p.ai_champion),
      lastActivity,
    };
  });

  // Bảng điểm chi tiết (học viên × bài tập) cho sheet 2 của file Excel
  const gradebook: GradebookData = {
    assignments: assignmentList.map((a) => ({
      id: a.id,
      title: a.title,
      maxScore: a.max_score,
    })),
    rows: studentRows.map((sr) => {
      const p = profiles?.find((prof) => prof.id === sr.id);
      return {
        fullName: sr.fullName,
        department: sr.department,
        factory: sr.factory,
        cells: assignmentList.map((a) => {
          const sub = submissions?.find((s) => s.assignment_id === a.id && s.student_id === p?.id);
          if (!sub) return "Chưa nộp";
          const late = (sub as any).is_late ? " (muộn)" : "";
          if (sub.status === "graded") return `${sub.score}/${a.max_score}${late}`;
          if (sub.status === "submitted") return `Chờ chấm${late}`;
          if (sub.status === "returned") return `Yêu cầu nộp lại${late}`;
          return "Nháp";
        }),
      };
    }),
  };

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
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Kết quả theo Bộ phận
            </CardTitle>
            <AssignmentMultiFilter assignments={assignmentList} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3 font-medium">Bộ phận</th>
                    <th className="py-2 pr-3 font-medium text-right">Học viên</th>
                    <th className="py-2 pr-3 font-medium text-right">Được chấm xong</th>
                    <th className="py-2 pr-3 font-medium text-right">Chờ chấm</th>
                    <th className="py-2 pr-3 font-medium text-right">Yêu cầu làm lại</th>
                    <th className="py-2 pr-3 font-medium text-right">Chưa gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {deptStats.map((d) => (
                    <tr key={d.key} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{d.label}</td>
                      <td className="py-2 pr-3 text-right text-gray-500">{d.count}</td>
                      <td className="py-2 pr-3 text-right text-green-600 font-medium">{d.graded} ({d.gradedPct}%)</td>
                      <td className="py-2 pr-3 text-right text-orange-600">{d.pending} ({d.pendingPct}%)</td>
                      <td className="py-2 pr-3 text-right text-red-500">{d.returned} ({d.returnedPct}%)</td>
                      <td className="py-2 pr-3 text-right text-gray-400">{d.notSubmitted} ({d.notSubmittedPct}%)</td>
                    </tr>
                  ))}
                  {deptStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">Chưa có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Factory breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kết quả theo Nhà máy / Đơn vị</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3 font-medium">Nhà máy / Đơn vị</th>
                    <th className="py-2 pr-3 font-medium text-right">Học viên</th>
                    <th className="py-2 pr-3 font-medium text-right">% Hoàn thành</th>
                    <th className="py-2 pr-3 font-medium text-right">Điểm TB</th>
                  </tr>
                </thead>
                <tbody>
                  {factoryStats.map((f) => (
                    <tr key={f.key} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{f.label}</td>
                      <td className="py-2 pr-3 text-right text-gray-500">{f.count}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${f.gradedPct >= 80 ? "text-green-600" : f.gradedPct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                        {f.graded} ({f.gradedPct}%)
                      </td>
                      <td className="py-2 pr-3 text-right text-purple-600">{f.avgScore ?? "--"}</td>
                    </tr>
                  ))}
                  {factoryStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">Chưa có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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

      <StudentProgressTable rows={studentRows} gradebook={gradebook} />
    </div>
  );
}
