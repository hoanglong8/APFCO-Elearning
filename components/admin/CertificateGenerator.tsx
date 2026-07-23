"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Loader2 } from "lucide-react";
import type { StudentProgressRow } from "./StudentProgressTable";

interface Props {
  rows: StudentProgressRow[];
}

export function CertificateGenerator({ rows }: Props) {
  const [threshold, setThreshold] = useState(70);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const qualifying = useMemo(
    () => rows.filter((r) => r.avgScore !== null && r.avgScore >= threshold),
    [rows, threshold]
  );

  async function handleGenerate() {
    if (qualifying.length === 0) return;
    setGenerating(true);
    setError("");
    try {
      const { generateCertificatesPDF } = await import("@/lib/certificate");
      const blob = await generateCertificatesPDF(
        qualifying.map((r) => ({
          fullName: r.fullName,
          department: r.department,
          factory: r.factory,
          avgScore: r.avgScore as number,
        })),
        new Date()
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chung-chi-hoan-thanh-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message ?? "Có lỗi khi tạo chứng chỉ.");
    }
    setGenerating(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="w-4 h-4" /> Tạo chứng chỉ hoàn thành khóa học
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Điểm trung bình tối thiểu</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-28"
            />
          </div>
          <p className="text-sm text-gray-500 pb-2">
            <strong className="text-gray-900">{qualifying.length}</strong> học viên đạt từ {threshold} điểm trở lên
          </p>
          <Button onClick={handleGenerate} disabled={generating || qualifying.length === 0} className="gap-2 sm:ml-auto">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            {generating ? "Đang tạo..." : `Tạo ${qualifying.length} chứng chỉ (PDF)`}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-gray-400">
          File PDF gồm {qualifying.length} trang (mỗi học viên 1 trang), dựa trên Điểm TB hiện có ở bảng bên dưới.
        </p>
      </CardContent>
    </Card>
  );
}
