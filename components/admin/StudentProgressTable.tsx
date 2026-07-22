"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface StudentProgressRow {
  id: string;
  fullName: string;
  department: string;
  factory: string;
  hasPlan: boolean;
  avgScore: number | null;
  submittedCount: number;
  totalAssignments: number;
  aiChampion: boolean;
  lastActivity: string | null;
}

export interface GradebookData {
  /** Cột bài tập, theo thứ tự tạo */
  assignments: { id: string; title: string; maxScore: number }[];
  /** Mỗi ô đã format sẵn: "85/100", "85/100 (muộn)", "Chờ chấm", "Chưa nộp"... */
  rows: { fullName: string; department: string; factory: string; cells: string[] }[];
}

type SortKey = "fullName" | "department" | "factory" | "hasPlan" | "avgScore" | "submittedCount" | "lastActivity";
type SortDir = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "fullName", label: "Học viên" },
  { key: "department", label: "Phòng ban" },
  { key: "factory", label: "Nhà máy" },
  { key: "hasPlan", label: "Đã viết kế hoạch" },
  { key: "avgScore", label: "Điểm TB" },
  { key: "submittedCount", label: "Bài đã nộp" },
  { key: "lastActivity", label: "Hoạt động gần nhất" },
];

function compareValues(a: StudentProgressRow, b: StudentProgressRow, key: SortKey): number {
  switch (key) {
    case "fullName":
    case "department":
    case "factory":
      return a[key].localeCompare(b[key], "vi");
    case "hasPlan":
      return Number(a.hasPlan) - Number(b.hasPlan);
    case "avgScore":
      return (a.avgScore ?? -1) - (b.avgScore ?? -1);
    case "submittedCount":
      return a.submittedCount - b.submittedCount;
    case "lastActivity":
      return (a.lastActivity ?? "").localeCompare(b.lastActivity ?? "");
  }
}

export function StudentProgressTable({ rows, gradebook }: { rows: StudentProgressRow[]; gradebook?: GradebookData }) {
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareValues(a, b, sortKey) * (sortDir === "asc" ? 1 : -1));
    return copy;
  }, [rows, sortKey, sortDir]);

  async function handleExport() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Tiến độ học viên");

      sheet.columns = [
        { header: "STT", key: "stt", width: 6 },
        { header: "Họ và tên", key: "fullName", width: 28 },
        { header: "Phòng ban", key: "department", width: 22 },
        { header: "Nhà máy", key: "factory", width: 20 },
        { header: "Đã viết kế hoạch", key: "hasPlan", width: 16 },
        { header: "Điểm trung bình", key: "avgScore", width: 16 },
        { header: "Bài đã nộp", key: "submitted", width: 14 },
        { header: "AI Champion", key: "aiChampion", width: 14 },
        { header: "Hoạt động gần nhất", key: "lastActivity", width: 20 },
      ];
      sheet.getRow(1).font = { bold: true };

      sortedRows.forEach((r, i) => {
        sheet.addRow({
          stt: i + 1,
          fullName: r.fullName,
          department: r.department,
          factory: r.factory,
          hasPlan: r.hasPlan ? "Có" : "Chưa",
          avgScore: r.avgScore ?? "",
          submitted: `${r.submittedCount}/${r.totalAssignments}`,
          aiChampion: r.aiChampion ? "Có" : "",
          lastActivity: r.lastActivity ? formatDateTime(r.lastActivity) : "",
        });
      });

      // Sheet 2: bảng điểm chi tiết theo từng bài tập
      if (gradebook && gradebook.assignments.length > 0) {
        const gradeSheet = workbook.addWorksheet("Bảng điểm chi tiết");
        gradeSheet.columns = [
          { header: "Họ và tên", key: "fullName", width: 28 },
          { header: "Phòng ban", key: "department", width: 22 },
          { header: "Nhà máy", key: "factory", width: 20 },
          ...gradebook.assignments.map((a, i) => ({
            header: `${a.title} (/${a.maxScore})`,
            key: `a${i}`,
            width: 22,
          })),
        ];
        gradeSheet.getRow(1).font = { bold: true };

        for (const r of gradebook.rows) {
          const row: Record<string, string> = {
            fullName: r.fullName,
            department: r.department,
            factory: r.factory,
          };
          r.cells.forEach((cell, i) => {
            row[`a${i}`] = cell;
          });
          gradeSheet.addRow(row);
        }
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
                <th className="py-2 pr-4 font-medium">STT</th>
                {columns.map((col) => (
                  <th key={col.key} className="py-2 pr-4 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-gray-800"
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
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
                    <span className={r.hasPlan ? "text-green-600 font-medium" : "text-gray-400"}>
                      {r.hasPlan ? "Có" : "Chưa"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{r.avgScore ?? "--"}</td>
                  <td className="py-2 pr-4 text-gray-600">{r.submittedCount}/{r.totalAssignments}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {r.lastActivity ? formatDateTime(r.lastActivity) : "Chưa có"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">Chưa có học viên</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
