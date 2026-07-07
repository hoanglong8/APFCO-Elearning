import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getScoreColor(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

export const DEPARTMENTS: Record<string, string> = {
  market: "Kinh doanh",
  finance: "Tài chính – Kế toán",
  factory: "Vận hành Nhà máy",
  hr: "Nhân sự – Hành chính",
  director: "Ban Giám đốc",
  qa: "QA – Chất lượng",
};

export const FACTORIES: Record<string, string> = {
  apfco: "APFCO (Quảng Ngãi)",
  kontum: "Kon Tum",
  sepon: "Sê Pôn",
  attapeu: "Attapeu",
  eakar: "Ea Kar",
  taoy: "Ta Oy",
  dakto: "Đắk Tô",
};

export const ROLES: Record<string, string> = {
  student: "Học viên",
  trainer: "Trainer",
  admin: "Admin",
  director: "Ban Giám đốc",
};

export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  wf_practice: "Thực hành Workflow",
  use_case: "Use Case",
  plan: "Kế hoạch",
  quiz: "Trắc nghiệm",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  submitted: "Đã nộp",
  graded: "Đã chấm",
  returned: "Yêu cầu nộp lại",
  not_started: "Chưa bắt đầu",
  in_progress: "Đang học",
  completed: "Hoàn thành",
};
