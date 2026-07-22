"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClipboardList, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { formatDateTime, STATUS_LABELS } from "@/lib/utils";
import { bulkGradeSubmissionsWithAIAction, type BulkAIGradeResult } from "@/app/admin/grading/actions";

interface Props {
  submissions: any[];
}

export function PendingSubmissionsList({ submissions }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = submissions.length > 0 && submissions.every((s) => selectedIds.has(s.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(submissions.map((s) => s.id)));
  }

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<BulkAIGradeResult[]>([]);

  function openBulk() {
    setBulkResults([]);
    setBulkProgress({ done: 0, total: 0 });
    setBulkOpen(true);
  }

  function closeBulk() {
    if (bulkRunning) return;
    setBulkOpen(false);
    const hadResults = bulkResults.length > 0;
    setBulkResults([]);
    setSelectedIds(new Set());
    if (hadResults) router.refresh();
  }

  async function runBulkGrade() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length });
    const results: BulkAIGradeResult[] = [];
    const chunkSize = 5;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const chunkResults = await bulkGradeSubmissionsWithAIAction(chunk);
      results.push(...chunkResults);
      setBulkProgress({ done: results.length, total: ids.length });
    }
    setBulkResults(results);
    setBulkRunning(false);
  }

  return (
    <div className="space-y-3">
      {submissions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            Chọn tất cả ({submissions.length})
          </label>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={openBulk}>
              <Sparkles className="w-4 h-4" /> Chấm bằng AI hàng loạt ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      {submissions.map((sub) => {
        const profile = sub.profiles;
        const assignment = sub.assignments;
        return (
          <Card key={sub.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => toggleSelect(sub.id)} />
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{profile?.full_name ?? "Học viên"}</p>
                      <p className="text-sm text-gray-500">{assignment?.title ?? "Bài tập"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.is_late && <Badge className="text-xs border-0 bg-amber-50 text-amber-700">Nộp muộn</Badge>}
                      <Badge className="text-xs border-0 bg-orange-50 text-orange-700">{STATUS_LABELS[sub.status]}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Nộp: {formatDateTime(sub.submitted_at ?? sub.created_at)}</p>
                </div>
                <Link href={`/admin/grading/${sub.id}`}>
                  <Button size="sm" className="gap-1">
                    Chấm bài <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {submissions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Không có bài nào chờ chấm</p>
        </div>
      )}

      {/* Bulk AI grade dialog */}
      <Dialog open={bulkOpen} onOpenChange={(open) => !open && closeBulk()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chấm bằng AI hàng loạt ({selectedIds.size} bài)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkResults.length === 0 ? (
              <>
                <p className="text-sm text-gray-600">
                  AI sẽ chấm điểm và <strong>trả bài ngay</strong> cho {selectedIds.size} bài đã chọn — học viên thấy
                  điểm/nhận xét ngay sau khi hoàn tất, không cần duyệt từng bài. Hãy rà soát bảng kết quả sau khi
                  chạy xong, vào từng bài để sửa lại nếu thấy điểm bất thường. Hành động này không thể hoàn tác.
                </p>
                <div className="flex gap-2">
                  <Button onClick={runBulkGrade} disabled={bulkRunning} className="gap-2">
                    {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {bulkRunning
                      ? `Đang chấm ${bulkProgress.done}/${bulkProgress.total}...`
                      : "Chấm & Trả bài hàng loạt"}
                  </Button>
                  <Button variant="outline" onClick={closeBulk} disabled={bulkRunning}>
                    Hủy
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  <span className="text-green-600 font-medium">
                    {bulkResults.filter((r) => r.success).length} đã chấm thành công
                  </span>
                  {" · "}
                  <span className="text-red-500 font-medium">
                    {bulkResults.filter((r) => !r.success).length} lỗi
                  </span>
                </p>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Học viên</TableHead>
                        <TableHead>Bài tập</TableHead>
                        <TableHead>Kết quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((r) => (
                        <TableRow key={r.submissionId}>
                          <TableCell>{r.studentName || "--"}</TableCell>
                          <TableCell className="text-gray-500">{r.assignmentTitle || "--"}</TableCell>
                          <TableCell>
                            {r.success ? (
                              <span className="text-green-600 font-medium">
                                {r.totalScore}/{r.maxScore}
                              </span>
                            ) : (
                              <span className="text-red-500 text-xs">{r.error}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" onClick={closeBulk}>
                  Đóng
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
