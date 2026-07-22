"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ListFilter } from "lucide-react";

interface Props {
  assignments: { id: string; title: string }[];
  /** Tên query param lưu danh sách id đã chọn (CSV), mặc định "assignments" */
  paramName?: string;
}

// Không có param trên URL = mặc định chọn TẤT CẢ bài tập (không lọc gì).
export function AssignmentMultiFilter({ assignments, paramName = "assignments" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramName);
  const selected = raw ? raw.split(",").filter(Boolean) : assignments.map((a) => a.id);
  const allSelected = assignments.length > 0 && selected.length === assignments.length;

  function updateSelection(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === assignments.length) {
      params.delete(paramName);
    } else {
      params.set(paramName, next.join(","));
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    updateSelection(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListFilter className="w-4 h-4" />
          {allSelected ? "Tất cả bài tập" : `Đã chọn ${selected.length}/${assignments.length} bài tập`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Tích chọn bài tập</span>
          {!allSelected && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline font-normal"
              onClick={() => updateSelection(assignments.map((a) => a.id))}
            >
              Chọn tất cả
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {assignments.map((a) => (
          <DropdownMenuCheckboxItem
            key={a.id}
            checked={selected.includes(a.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(a.id)}
            className="text-sm"
          >
            {a.title}
          </DropdownMenuCheckboxItem>
        ))}
        {assignments.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-gray-400">Chưa có bài tập nào</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
