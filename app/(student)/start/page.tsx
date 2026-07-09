import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, FlaskConical } from "lucide-react";

export default async function StartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: wfAssignment }, { data: firstModule }] = await Promise.all([
    supabase.from("assignments").select("id, title, description").ilike("title", "%WF-A%").limit(1).maybeSingle(),
    supabase.from("modules").select("id, title").eq("is_published", true).order("day_number").order("order_index").limit(1).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Đào tạo AI cho cán bộ quản lý APFCO</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Bắt đầu tại đây</h1>
        <p className="text-gray-500 mt-1">Cổng đào tạo AI dành cho cán bộ quản lý APFCO</p>
      </div>

      {/* Hero */}
      <div className="bg-green-700 rounded-2xl p-6 md:p-8 text-white grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">Công việc thật</Badge>
            <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">→ AI tạo bản nháp</Badge>
            <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">→ Con người kiểm tra</Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight">
            Thực hành AI bằng quy trình công việc thật
          </h2>
          <p className="text-green-50">
            Làm theo từng bước để dùng AI xử lý một công việc thật, kiểm tra kết quả và tạo quy trình
            có thể dùng lại cho công việc hằng ngày.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {wfAssignment && (
              <Link href={`/assignments/${wfAssignment.id}/submit`}>
                <Button className="bg-white text-green-700 hover:bg-green-50 gap-2">
                  Bắt đầu WF-A <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Link href="/prepare-account">
              <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                Mở hướng dẫn tài khoản
              </Button>
            </Link>
            {firstModule && (
              <Link href={`/modules/${firstModule.id}`}>
                <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  Mở slide khóa học
                </Button>
              </Link>
            )}
          </div>
          <p className="text-xs text-green-100">
            Không cần tài khoản trả phí để làm luồng chính · Dùng trong đào tạo nội bộ
          </p>
        </div>

        <Card className="bg-white text-gray-900 self-start">
          <CardContent className="p-5 space-y-3">
            <Badge className="bg-green-50 text-green-700 border-0">Chuẩn bị nhanh</Badge>
            <p className="font-semibold">Trước khi bắt đầu</p>
            <ul className="space-y-2.5">
              {[
                "Có tài khoản ChatGPT hoặc Gemini.",
                "Không cần mua gói trả phí.",
                "Không đưa dữ liệu mật hoặc dữ liệu đỏ vào AI public.",
                "Dùng tài liệu được cung cấp trong bài tập.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Bài đầu tiên */}
      <Card>
        <CardContent className="p-6 grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bài đầu tiên</h3>
              <p className="text-gray-500 mt-1">
                {wfAssignment?.description ??
                  "Bắt đầu với bài Ghi chú họp để tạo biên bản, quyết định và bảng theo dõi hành động. Kết quả cuối cùng cần được con người kiểm tra trước khi nộp."}
              </p>
            </div>
            <ol className="space-y-2">
              {["Mở ChatGPT hoặc Gemini", "Mở tài liệu bài tập"].map((step, i) => (
                <li key={step} className="flex items-center gap-3 border rounded-lg p-3">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {wfAssignment && (
            <Card className="bg-gray-50 self-start border-l-4 border-l-green-600">
              <CardContent className="p-4 space-y-2">
                <Badge className="bg-green-50 text-green-700 border-0">Luồng chính</Badge>
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-green-600" /> WF-A
                </p>
                <p className="text-sm text-gray-500">Ghi chú họp → Biên bản và hành động</p>
                <Link href={`/assignments/${wfAssignment.id}/submit`}>
                  <Button size="sm" className="gap-1 mt-1">
                    Đi tới WF-A <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
