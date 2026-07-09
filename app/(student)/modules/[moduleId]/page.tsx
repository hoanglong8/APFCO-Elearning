import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileText, Video, Link2, Download, ArrowLeft,
  CheckCircle2, Clock, FlaskConical, PlayCircle, Circle,
} from "lucide-react";
import { MarkCompleteButton } from "@/components/student/MarkCompleteButton";
import { PromptCopyButton } from "@/components/shared/PromptCopyButton";

const materialTypeIcon: Record<string, React.ElementType> = {
  slide: FileText,
  pdf: FileText,
  video: Video,
  link: Link2,
  prompt: FileText,
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-green-600", label: "Đã hoàn thành" },
  in_progress: { icon: PlayCircle, color: "text-blue-600", label: "Đang học" },
  not_started: { icon: Circle, color: "text-gray-400", label: "Chưa bắt đầu" },
} as const;

export default async function ModuleDetailPage({ params }: { params: { moduleId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: mod }, { data: materials }, { data: practices }, { data: progress }] = await Promise.all([
    supabase.from("modules").select("*").eq("id", params.moduleId).single(),
    supabase.from("materials").select("*").eq("module_id", params.moduleId).order("order_index"),
    supabase.from("workflow_practices").select("*").eq("module_id", params.moduleId).order("order_index"),
    supabase.from("module_progress").select("*").eq("student_id", user.id).eq("module_id", params.moduleId).single(),
  ]);

  if (!mod) notFound();

  const status = progress?.status ?? "not_started";
  const isCompleted = status === "completed";
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.not_started;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/modules" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Ngày {mod.day_number}</Badge>
            <Badge variant="outline" className={`${cfg.color} border-current gap-1`}>
              <StatusIcon className="w-3 h-3" /> {cfg.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{mod.title}</h1>
          {mod.description && <p className="text-gray-500 mt-2">{mod.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            {mod.estimated_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {mod.estimated_minutes} phút
              </span>
            )}
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> {materials?.length ?? 0} tài liệu
            </span>
          </div>
        </div>
        <MarkCompleteButton
          moduleId={mod.id}
          studentId={user.id}
          isCompleted={isCompleted}
          progressId={progress?.id}
        />
      </div>

      {/* Materials */}
      {materials && materials.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Tài liệu & Slide</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {materials.map((mat) => {
              const Icon = materialTypeIcon[mat.material_type] ?? FileText;
              const url = mat.file_url ?? mat.external_url;
              return (
                <Card key={mat.id} className="border-t-4 border-t-green-600">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="font-semibold text-gray-900">{mat.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Loại: {mat.material_type}</p>
                    <div className="flex items-center gap-2">
                      {mat.material_type === "prompt" && mat.file_url && (
                        <PromptCopyButton url={mat.file_url} />
                      )}
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1">
                            {mat.is_downloadable ? <Download className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                            {mat.is_downloadable ? "Tải tài liệu" : "Mở tài liệu"}
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Workflow Practices */}
      {practices && practices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Thực hành Workflow</h2>
          {practices.map((wf) => (
            <Card key={wf.id} className="border-l-4 border-l-green-600">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">{wf.wf_code}</Badge>
                      <h3 className="font-semibold text-gray-900">{wf.title}</h3>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-gray-500 mb-3">{wf.description}</p>
                    )}
                    {wf.prompt_template && (
                      <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 max-h-32 overflow-y-auto">
                        {wf.prompt_template}
                      </div>
                    )}
                  </div>
                  <Link href={`/practice/${wf.id}`} className="flex-shrink-0">
                    <Button size="sm" className="gap-1">
                      <FlaskConical className="w-4 h-4" /> Thực hành
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Bạn đã hoàn thành module này!</span>
        </div>
      )}
    </div>
  );
}
