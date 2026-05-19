"use client";

import { useEffect, useState } from "react";
import { saveLead, track } from "@/lib/tracking";
import { useRouter } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track({ event_name: "lead_form_view", event_target: "apply_page" });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await track({ event_name: "purchase_intent", event_target: "apply_submit_click", metadata: { price: data.price_choice } });
    const result = await saveLead(data);
    setLoading(false);
    if (result.ok) router.push("/thanks");
    else alert("저장 중 오류가 났습니다. 잠시 후 다시 시도해주세요.");
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <span className="badge">신청 폼 · 실제 결제 없음</span>
        <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)" }}>베타 진단 신청</h1>
        <p className="muted">신청 완료 시 구매 의사 전환으로 기록됩니다. 정식 오픈 시 할인 링크를 보내드립니다.</p>

        <form className="card" onSubmit={onSubmit}>
          <div className="form-row">
            <label>이름<input name="name" required placeholder="홍길동" /></label>
          </div>
          <div className="form-row">
            <label>이메일<input name="email" type="email" required placeholder="you@example.com" /></label>
          </div>
          <div className="form-row">
            <label>지원 직무<input name="target_role" required placeholder="예: Product Manager, Software Engineer" /></label>
          </div>
          <div className="form-row">
            <label>현재 가장 막히는 단계
              <select name="current_blocker" required defaultValue="">
                <option value="" disabled>선택해주세요</option>
                <option>서류 탈락</option>
                <option>리크루터 스크리닝</option>
                <option>1차/실무 면접</option>
                <option>최종 면접</option>
                <option>어디가 문제인지 모름</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>이력서/LinkedIn 링크 선택<input name="profile_url" placeholder="https://..." /></label>
          </div>
          <div className="form-row">
            <label>가장 궁금한 점<textarea name="pain_point" rows={5} placeholder="예: 30개 지원했는데 서류 전환이 거의 없어요." /></label>
          </div>
          <div className="form-row">
            <label>가격 의사
              <select name="price_choice" required defaultValue="49000">
                <option value="29000">₩29,000이면 신청</option>
                <option value="49000">₩49,000이면 신청</option>
                <option value="99000">₩99,000까지 고려</option>
                <option value="undecided">가격 고민 중</option>
              </select>
            </label>
          </div>
          <button className="cta" style={{ width: "100%" }} disabled={loading}>
            {loading ? "저장 중..." : "신청 완료하고 할인 링크 받기"}
          </button>
        </form>
      </div>
    </main>
  );
}
