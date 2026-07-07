"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface StudentProgressRow {
  id: string;
  fullName: string;
  department: string;
  factory: string;
  completedModules: number;
  totalModules: number;
  pct: number;
  avgScore: number | null;
  submissionsCount: number;
  aiChampion: boolean;
  lastActivity: string | null;
}

function pctColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-500";
}

export function StudentProgressTable({ rows }: { rows: StudentProgressRow[] }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Tiến độ học viên");

      sheet.columns = [
        { header: "Họ và tên", key: "fullName", width: 28 },
        { header: "Phòng ban", key: "department", width: 22 },
        { header: "Nhà máy", key: "factory", width: 20 },
        { header: "Module hoàn thành", key: "modules", width: 18 },
        { header: "Tỷ lệ hoàn thành (%)", key: "pct", width: 20 },
        { header: "Điểm trung bình", key: "avgScore", width: 16 },
        { header: "Số bài đã nộp", key: "submissionsCount", width: 14 },
        { header: "AI Champion", key: "aiChampion", width: 14 },
        { header: "Hoạt động gần nhất", key: "lastActivity", width: 20 },
      ];
      sheet.getRow(1).font = { bold: true };

      for (const r of rows) {
        sheet.addRow({
          fullName: r.fullName,
          department: r.department,
          factory: r.factory,
          modules: `${r.completedModules}/${r.totalModules}`,
          pct: r.pct,
          avgScore: r.avgScore ?? "",
          submissionsCount: r.submissionsCount,
          aiChampion: r.aiChampion ? "Có" : "",
          lastActivity: r.lastActivity ? formatDateTime(r.lastActivity) : "",
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-tien-do-hoc-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Theo dõi tiến độ học viên</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Xuất Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Học viên</th>
                <th className="py-2 pr-4 font-medium">Phòng ban</th>
                <th className="py-2 pr-4 font-medium">Nhà máy</th>
                <th className="py-2 pr-4 font-medium">Module</th>
                <th className="py-2 pr-4 font-medium">Điểm TB</th>
                <th className="py-2 pr-4 font-medium">Bài đã nộp</th>
                <th className="py-2 pr-4 font-medium">Hoạt động gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{r.fullName}</span>
                      {r.aiChampion && (
                        <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-0">Champion</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{r.department}</td>
                  <td className="py-2 pr-4 text-gray-600">{r.factory}</td>
                  <td className="py-2 pr-4">
                    <span className={`font-semibold ${pctColor(r.pct)}`}>
                      {r.completedModules}/{r.totalModules} ({r.pct}%)
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{r.avgScore ?? "--"}</td>
                  <td className="py-2 pr-4 text-gray-600">{r.submissionsCount}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {r.lastActivity ? formatDateTime(r.lastActivity) : "Chưa có"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">Chưa có học viên</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
