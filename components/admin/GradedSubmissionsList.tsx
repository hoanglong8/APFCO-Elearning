"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClipboardList, ChevronRight, RotateCcw, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { bulkRequestResubmissionAction, type BulkReturnResult } from "@/app/admin/grading/actions";

interface Props {
  submissions: any[];
}

export function GradedSubmissionsList({ submissions }: Props) {
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
  const [bulkNote, setBulkNote] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkReturnResult[]>([]);

  function openBulk() {
    setBulkResults([]);
    setBulkNote("");
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

  async function runBulkReturn() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkRunning(true);
    const results = await bulkRequestResubmissionAction(ids, bulkNote);
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
              <RotateCcw className="w-4 h-4" /> Yêu cầu làm lại ({selectedIds.size})
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
                      {sub.status === "graded" && sub.score !== null && (
                        <span className="font-bold text-green-700">
                          {sub.score}/{assignment?.max_score}
                        </span>
                      )}
                      {sub.is_late && <Badge className="text-xs border-0 bg-amber-50 text-amber-700">Nộp muộn</Badge>}
                      <Badge className="text-xs border-0 bg-green-50 text-green-700">Đã chấm</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Nộp: {formatDateTime(sub.submitted_at ?? sub.created_at)}</p>
                </div>
                <Link href={`/admin/grading/${sub.id}`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    Chấm lại <ChevronRight className="w-3 h-3" />
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
          <p>Chưa có bài nào được chấm</p>
        </div>
      )}

      {/* Bulk request-resubmission dialog */}
      <Dialog open={bulkOpen} onOpenChange={(open) => !open && closeBulk()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yêu cầu làm lại hàng loạt ({selectedIds.size} bài)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkResults.length === 0 ? (
              <>
                <p className="text-sm text-gray-600">
                  Chuyển trạng thái {selectedIds.size} bài đã chọn sang "Yêu cầu nộp lại" — học viên sẽ được thông báo
                  và có thể nộp lại bài. Điểm hiện tại được giữ nguyên cho đến khi chấm lại.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lý do yêu cầu làm lại (tuỳ chọn, thêm vào nhận xét hiện có)</label>
                  <Textarea
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    rows={3}
                    placeholder="Vd: Vui lòng bổ sung thêm ảnh chụp màn hình kết quả..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={runBulkReturn} disabled={bulkRunning} className="gap-2">
                    {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {bulkRunning ? "Đang xử lý..." : "Yêu cầu làm lại hàng loạt"}
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
                    {bulkResults.filter((r) => r.success).length} đã xử lý thành công
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
                              <span className="text-green-600 font-medium">Đã chuyển "Yêu cầu nộp lại"</span>
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
