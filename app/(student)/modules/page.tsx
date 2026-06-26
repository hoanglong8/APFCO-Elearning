import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";

export default async function ModulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: modules }, { data: progress }] = await Promise.all([
    supabase.from("modules").select("*, materials(id)").eq("is_published", true).order("day_number").order("order_index"),
    supabase.from("module_progress").select("*").eq("student_id", user.id),
  ]);

  function getStatus(moduleId: string) {
    return progress?.find((p) => p.module_id === moduleId)?.status ?? "not_started";
  }

  const days = [1, 2];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tài liệu học</h1>
        <p className="text-gray-500 mt-1">Các module đào tạo kỹ năng AI cho APFCO</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="day1">Ngày 1</TabsTrigger>
          <TabsTrigger value="day2">Ngày 2</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-6">
          {days.map((day) => {
            const dayModules = modules?.filter((m) => m.day_number === day) ?? [];
            if (dayModules.length === 0) return null;
            return (
              <div key={day}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Ngày {day}</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {dayModules.map((mod) => (
                    <ModuleCard key={mod.id} mod={mod} status={getStatus(mod.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {days.map((day) => (
          <TabsContent key={day} value={`day${day}`} className="mt-4">
            <div className="grid md:grid-cols-2 gap-3">
              {modules?.filter((m) => m.day_number === day).map((mod) => (
                <ModuleCard key={mod.id} mod={mod} status={getStatus(mod.id)} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ModuleCard({ mod, status }: { mod: any; status: string }) {
  const statusConfig = {
    completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Hoàn thành" },
    in_progress: { icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-50", label: "Đang học" },
    not_started: { icon: Circle, color: "text-gray-400", bg: "bg-gray-50", label: "Chưa bắt đầu" },
  };
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.not_started;
  const Icon = cfg.icon;

  return (
    <Link href={`/modules/${mod.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 ${cfg.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <BookOpen className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {mod.title}
              </p>
              {mod.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mod.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {mod.estimated_minutes && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" /> {mod.estimated_minutes} phút
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <BookOpen className="w-3 h-3" /> {mod.materials?.length ?? 0} tài liệu
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="outline" className={`${cfg.color} border-current text-xs gap-1`}>
                <Icon className="w-3 h-3" /> {cfg.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
