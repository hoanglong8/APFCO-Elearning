import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileText, Video, Link2, Download, ArrowLeft,
  CheckCircle2, Clock, FlaskConical,
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

  const isCompleted = progress?.status === "completed";

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/modules" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2">Ngày {mod.day_number}</Badge>
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tài liệu & Slide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {materials.map((mat) => {
              const Icon = materialTypeIcon[mat.material_type] ?? FileText;
              const url = mat.file_url ?? mat.external_url;
              return (
                <div key={mat.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{mat.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{mat.material_type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mat.material_type === "prompt" && mat.file_url && (
                      <PromptCopyButton url={mat.file_url} />
                    )}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1 h-8">
                          {mat.is_downloadable ? <Download className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                          {mat.is_downloadable ? "Tải" : "Mở"}
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Workflow Practices */}
      {practices && practices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Thực hành Workflow</h2>
          {practices.map((wf) => (
            <Card key={wf.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{wf.wf_code}</Badge>
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
