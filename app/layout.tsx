import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APFCO AI Training",
  description: "Cổng đào tạo kỹ năng AI nội bộ APFCO",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
