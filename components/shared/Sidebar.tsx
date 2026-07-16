"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  LayoutGrid,
  BookOpen,
  FlaskConical,
  ClipboardList,
  Star,
  Target,
  Users,
  Rocket,
  ShieldCheck,
  BarChart3,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import type { Profile } from "@/types/database.types";

const studentNav = [
  { href: "/start", label: "Bắt đầu", icon: Rocket },
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/prepare-account", label: "Chuẩn bị tài khoản", icon: ShieldCheck },
  { href: "/modules", label: "Tài liệu học", icon: BookOpen },
  { href: "/assignments", label: "Bài tập", icon: ClipboardList },
  { href: "/grades", label: "Kết quả", icon: Star },
  { href: "/survey", label: "Khảo sát", icon: BarChart3 },
  { href: "/plan", label: "Kế hoạch 2 tuần", icon: Target },
];

const adminNav = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/modules", label: "Module", icon: LayoutGrid },
  { href: "/admin/materials", label: "Tài liệu", icon: BookOpen },
  { href: "/admin/assignments", label: "Bài tập", icon: ClipboardList },
  { href: "/admin/grading", label: "Chấm bài", icon: FlaskConical },
  { href: "/admin/reports", label: "Báo cáo", icon: Star },
  { href: "/admin/users", label: "Người dùng", icon: Users, adminOnly: true },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = ["admin", "trainer", "director"].includes(profile.role);
  const navItems = (isAdmin ? adminNav : studentNav).filter(
    (item) => !("adminOnly" in item) || profile.role === "admin"
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-gray-900 truncate">APFCO Training</p>
            <p className="text-xs text-gray-400">
              {isAdmin ? "Quản trị viên" : "Học viên"}
            </p>
          </div>
          {!isAdmin && <NotificationBell />}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-700 font-semibold text-xs">
              {profile.full_name?.charAt(0) ?? "U"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{profile.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-500 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
