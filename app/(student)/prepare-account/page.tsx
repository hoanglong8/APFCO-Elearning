import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, FileText, LifeBuoy } from "lucide-react";

const aiTools = [
  { name: "ChatGPT", url: "https://chat.openai.com" },
  { name: "Gemini", url: "https://gemini.google.com" },
  { name: "NotebookLM", url: "https://notebooklm.google.com" },
];

export default function PrepareAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Đào tạo AI cho cán bộ quản lý APFCO</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Chuẩn bị tài khoản</h1>
        <p className="text-gray-500 mt-1">Cổng đào tạo AI dành cho cán bộ quản lý APFCO</p>
      </div>

      <Card className="border-t-4 border-t-green-600">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Chuẩn bị tài khoản</h2>
          <p className="text-gray-500 mt-1">Kiểm tra trước khi học để không mất thời gian khi vào phần thực hành.</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-t-4 border-t-green-600 md:col-span-2">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">1. Đăng ký hoặc đăng nhập được ít nhất một công cụ AI</h3>
            <p className="text-sm text-gray-500">
              Dùng bản miễn phí là đủ cho khóa học — không cần mua gói trả phí. Chọn 1 trong các công cụ dưới đây:
            </p>
            <div className="flex flex-wrap gap-2">
              {aiTools.map((tool) => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    {tool.name} <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-600">
          <CardContent className="p-5 space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" /> 2. Mở được tài liệu mẫu và biểu mẫu nộp bài
            </h3>
            <p className="text-sm text-gray-500">Kiểm tra bạn có thể truy cập tài liệu học và nộp bài tập trong hệ thống.</p>
            <Link href="/modules">
              <Button variant="outline" size="sm" className="gap-1 mt-1">Mở tài liệu học</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-600">
          <CardContent className="p-5 space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-green-600" /> 3. Biết cách hỏi hỗ trợ khi gặp khó khăn
            </h3>
            <p className="text-sm text-gray-500">
              Nếu bị chặn đăng nhập hoặc không thấy đường dẫn tài liệu, liên hệ đội ngũ hỗ trợ hoặc trainer phụ trách lớp để được giúp đỡ trước khi vào phần thực hành.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
