import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WorkflowPracticeForm } from "@/components/student/WorkflowPracticeForm";

export default async function PracticePage({ params }: { params: { wfId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: wf } = await supabase
    .from("workflow_practices")
    .select("*")
    .eq("id", params.wfId)
    .single();

  if (!wf) notFound();

  const { data: logs } = await supabase
    .from("practice_logs")
    .select("*")
    .eq("student_id", user.id)
    .eq("wf_id", params.wfId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <Link href={`/modules/${wf.module_id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Quay lại module
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-blue-100 text-blue-700 border-0">{wf.wf_code}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{wf.title}</h1>
        {wf.description && <p className="text-gray-500 mt-1">{wf.description}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Instructions & Template */}
        <div className="space-y-4">
          {wf.instructions_html && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hướng dẫn thực hành</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-gray-600"
                  dangerouslySetInnerHTML={{ __html: wf.instructions_html }}
                />
              </CardContent>
            </Card>
          )}

          {wf.prompt_template && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  Prompt mẫu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                  {wf.prompt_template}
                </pre>
                <div className="mt-3 flex gap-2">
                  <a
                    href="https://chat.openai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline"
                  >
                    Mở ChatGPT →
                  </a>
                  <span className="text-xs text-gray-300">|</span>
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline"
                  >
                    Mở Gemini →
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {wf.sample_input && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Input mẫu</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-amber-50 rounded-lg p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-48">
                  {wf.sample_input}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Practice Form */}
        <WorkflowPracticeForm
          wfId={params.wfId}
          studentId={user.id}
          promptTemplate={wf.prompt_template ?? ""}
          previousLogs={logs ?? []}
        />
      </div>
    </div>
  );
}
