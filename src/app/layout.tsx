import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "정비지원", template: "%s | 정비지원" },
  description: "장비 정비 신청 및 처리 현황",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#324b2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
