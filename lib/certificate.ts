export interface CertificateStudent {
  fullName: string;
  department: string;
  factory: string;
  avgScore: number;
}

function formatDateVN(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function drawCertificatePage(doc: any, s: CertificateStudent, w: number, h: number, issuedAt: Date) {
  // Viền kép trang trí
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, w - 24, h - 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.text("APFCO AI TRAINING", w / 2, 32, { align: "center" });

  doc.setFontSize(26);
  doc.setTextColor(30, 30, 30);
  doc.text("CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC", w / 2, 48, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Chứng nhận", w / 2, 66, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(s.fullName, w / 2, 80, { align: "center" });
  const nameWidth = doc.getTextWidth(s.fullName);
  doc.setLineWidth(0.5);
  doc.setDrawColor(30, 30, 30);
  doc.line(w / 2 - nameWidth / 2 - 4, 84, w / 2 + nameWidth / 2 + 4, 84);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  const deptLine = [s.department, s.factory].filter((v) => v && v !== "--").join(" – ");
  doc.text(
    `đã hoàn thành khóa đào tạo Kỹ năng AI nội bộ${deptLine ? ` (${deptLine})` : ""}`,
    w / 2,
    96,
    { align: "center" }
  );
  doc.text(`với điểm trung bình ${s.avgScore}/100`, w / 2, 106, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Ngày cấp: ${formatDateVN(issuedAt)}`, w / 2, h - 26, { align: "center" });

  doc.setDrawColor(150, 150, 150);
  doc.line(w - 80, h - 38, w - 30, h - 38);
  doc.setFontSize(10);
  doc.text("Giám đốc đào tạo", w - 55, h - 32, { align: "center" });
}

export async function generateCertificatesPDF(students: CertificateStudent[], issuedAt: Date): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  students.forEach((s, i) => {
    if (i > 0) doc.addPage();
    drawCertificatePage(doc, s, w, h, issuedAt);
  });

  return doc.output("blob");
}
