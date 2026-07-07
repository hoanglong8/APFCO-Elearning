"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  assignments: { id: string; title: string }[];
}

export function GradingFilter({ assignments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("assignment") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("assignment");
    } else {
      params.set("assignment", value);
    }
    router.push(`/admin/grading${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-64"><SelectValue placeholder="Lọc theo bài tập" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả bài tập</SelectItem>
        {assignments.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
