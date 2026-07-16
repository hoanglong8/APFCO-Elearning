"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import type { Notification } from "@/types/database.types";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function NotificationBell() {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifications(data ?? []);
    setUnread((data ?? []).filter((n) => !n.is_read).length);
  }, [supabase]);

  useEffect(() => {
    load();
    // Không dùng Realtime để tiết kiệm kết nối — refresh mỗi phút là đủ
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleOpenChange(open: boolean) {
    if (open && unread > 0) {
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      setUnread(0);
      setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Thông báo"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-semibold">Thông báo</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có thông báo nào</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-gray-50 transition-colors ${
                n.is_read ? "" : "bg-green-50/50"
              }`}
              onClick={() => n.link && router.push(n.link)}
            >
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
              <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
