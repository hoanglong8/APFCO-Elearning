"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  moduleId: string;
  studentId: string;
  isCompleted: boolean;
  progressId?: string;
}

export function MarkCompleteButton({ moduleId, studentId, isCompleted, progressId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(isCompleted);
  const router = useRouter();
  const supabase = createClient();

  async function toggle() {
    setLoading(true);
    const newStatus = done ? "in_progress" : "completed";
    if (progressId) {
      await supabase.from("module_progress").update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      }).eq("id", progressId);
    } else {
      await supabase.from("module_progress").upsert({
        student_id: studentId,
        module_id: moduleId,
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      });
    }
    setDone(!done);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={done ? "default" : "outline"}
      className={`gap-2 flex-shrink-0 ${done ? "bg-green-600 hover:bg-green-700" : ""}`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      {done ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
    </Button>
  );
}
