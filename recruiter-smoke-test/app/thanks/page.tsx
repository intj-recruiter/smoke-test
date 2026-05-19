"use client";

import { useEffect } from "react";
import { track } from "@/lib/tracking";
import Link from "next/link";

export default function ThanksPage() {
  useEffect(() => {
    track({ event_name: "conversion_complete", event_target: "thanks_page" });
  }, []);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="card">
          <span className="badge">신청 완료</span>
          <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)" }}>베타 신청이 완료되었습니다.</h1>
          <p className="muted">
            정식 오픈 전 우선 안내와 할인 링크를 이메일로 보내드릴 예정입니다.
          </p>
          <Link className="cta secondary" href="/">상세페이지 다시 보기</Link>
        </div>
      </div>
    </main>
  );
}
