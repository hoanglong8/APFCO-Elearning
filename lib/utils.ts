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

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export function getScoreColor(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

export const DEPARTMENTS: Record<string, string> = {
  kd_thi_truong: "Kinh doanh thị trường",
  ky_thuat: "Kỹ thuật",
  ql_hanh_chinh: "Quản lý - tổ chức hành chính",
  tai_chinh: "Tài chính",
  hdqt_bks: "HĐQT và BKS",
};

export const FACTORIES: Record<string, string> = {
  vp_cong_ty: "Văn phòng công ty",
  xuong_co_khi: "Xưởng cơ khí",
  tbs_quang_ngai: "Nhà máy TBS Quảng Ngãi",
  tbs_dak_to: "Nhà máy TBS Đăk Tô",
  tbs_gia_lai: "Nhà máy TBS Gia Lai",
  tbs_dong_xuan: "Nhà máy TBS Đồng Xuân",
  tbs_dak_song: "Nhà máy TBS Đăk Song",
  tbs_tan_chau: "Nhà máy TBS Tân Châu",
  tbs_dong_phu: "Nhà máy TBS Đồng Phú",
  tbs_kon_tum: "Công ty TBS Kon Tum",
  khanh_duong_dak_lak: "Công ty Khánh Dương Đăk Lăk",
  tbs_eakar: "Công ty TBS Eakar",
  nong_san_tay_nguyen: "Công ty nông sản Tây Nguyên",
  tbs_dak_nong: "Công ty TBS Đăk Nông",
  tbs_se_pon: "Công ty TBS Sê Pôn",
  tbs_attapeu: "Công ty TBS Attapeu",
  tbs_taoy: "Công ty TBS Taoy",
};

// Chấp nhận cả key nội bộ (vd. "kd_thi_truong") lẫn nhãn hiển thị (vd.
// "Kinh doanh thị trường", không phân biệt hoa/thường) khi người dùng gõ tay
// trong file import — admin thường gõ tên hiển thị chứ không biết key nội bộ.
export function resolveCatalogKey(value: string, dict: Record<string, string>): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed in dict) return trimmed;
  const lower = trimmed.toLowerCase();
  const entry = Object.entries(dict).find(([, label]) => label.toLowerCase() === lower);
  return entry ? entry[0] : null;
}

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
