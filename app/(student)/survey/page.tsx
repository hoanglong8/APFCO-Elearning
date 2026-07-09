import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck } from "lucide-react";

const statCards = [
  { tag: "Người trả lời duy nhất", value: "43 người", sub: "Sau khi loại phản hồi trùng" },
  { tag: "Người mới hoặc mới thử AI", value: "53,5%", sub: "23/43 · Chưa từng dùng hoặc mới thử 1–2 lần" },
  { tag: "Lo ngại lộ dữ liệu", value: "50%", sub: "21/42 · Câu hỏi chọn nhiều đáp án" },
  { tag: "Sẵn sàng pilot nếu được hỗ trợ", value: "97,7%", sub: "42/43 · Có hoặc có nếu được hỗ trợ thêm" },
];

const usageLevels = [
  { label: "Chưa từng dùng", count: 17, pct: 39.5 },
  { label: "Đã thử 1–2 lần", count: 6, pct: 14 },
  { label: "Thỉnh thoảng dùng", count: 14, pct: 32.6 },
  { label: "Dùng hằng tuần", count: 3, pct: 7 },
];

const toolsUsed = [
  { label: "ChatGPT", count: 26, pct: 61.9 },
  { label: "Gemini", count: 15, pct: 35.7 },
  { label: "Chưa dùng công cụ nào", count: 14, pct: 33.3 },
  { label: "NotebookLM", count: 3, pct: 7.1 },
];

export default function SurveyPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Đào tạo AI cho cán bộ quản lý APFCO</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Kết quả khảo sát trước khóa học</h1>
        <p className="text-gray-500 mt-1">Cổng đào tạo AI dành cho cán bộ quản lý APFCO</p>
      </div>

      {/* Hero */}
      <div className="bg-green-700 rounded-2xl p-6 md:p-8 text-white grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-green-100">Kết quả khảo sát trước khóa học</p>
          <h2 className="text-2xl md:text-3xl font-bold">43 cán bộ quản lý tham gia khảo sát</h2>
          <p className="text-green-50">Dữ liệu được tổng hợp và không hiển thị thông tin nhận dạng cá nhân.</p>
        </div>
        <Card className="bg-white text-gray-900 self-start">
          <CardContent className="p-5 space-y-2">
            <Badge className="bg-green-50 text-green-700 border-0 gap-1">
              <ShieldCheck className="w-3 h-3" /> Ẩn danh
            </Badge>
            <p className="font-semibold">Quy tắc dữ liệu</p>
            <p className="text-sm text-gray-500">
              Dữ liệu đã được tổng hợp; không chứa thông tin nhận dạng cá nhân, thời điểm phản hồi cá
              nhân, chức danh cụ thể hoặc phản hồi mở nguyên văn.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.tag}>
            <CardContent className="p-4 space-y-2">
              <Badge className="bg-green-50 text-green-700 border-0 text-xs">{s.tag}</Badge>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown panels */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Mức độ đã sử dụng AI</h3>
              <span className="text-xs text-gray-400">Một lựa chọn · n=43</span>
            </div>
            <div className="space-y-3">
              {usageLevels.map((l) => (
                <div key={l.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{l.label}</span>
                    <span className="text-gray-500">{l.count} người · {l.pct}%</span>
                  </div>
                  <Progress value={l.pct} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Công cụ AI đã sử dụng</h3>
              <span className="text-xs text-gray-400">Chọn nhiều đáp án · n=42</span>
            </div>
            <div className="space-y-3">
              {toolsUsed.map((t) => (
                <div key={t.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{t.label}</span>
                    <span className="text-gray-500">{t.count} người · {t.pct}%</span>
                  </div>
                  <Progress value={t.pct} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
