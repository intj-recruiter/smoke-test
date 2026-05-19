import "./globals.css";
import type { Metadata } from "next";
import AnalyticsScripts from "@/components/AnalyticsScripts";

export const metadata: Metadata = {
  title: "Big Tech Recruiter Fit Check",
  description: "빅테크 리크루터 관점으로 취업 실패 이유를 진단해드립니다."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AnalyticsScripts />
        {children}
      </body>
    </html>
  );
}
