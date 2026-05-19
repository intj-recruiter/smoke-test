"use client";

import BehaviorTracker from "@/components/BehaviorTracker";
import { track } from "@/lib/tracking";
import Link from "next/link";

const sections = [
  {
    title: "서류에서 계속 떨어지는 이유",
    body: "경력이나 스펙이 부족해서가 아니라, 리크루터가 10초 안에 찾는 신호가 보이지 않는 경우가 많습니다."
  },
  {
    title: "면접 기회가 오지 않는 이유",
    body: "JD와 이력서의 매칭 포인트, 임팩트 표현, 역할 범위가 흐리면 좋은 경험도 약하게 읽힙니다."
  },
  {
    title: "다음 지원 전에 고칠 것",
    body: "지원 직무 기준으로 무엇을 빼고, 무엇을 앞으로 당겨야 하는지 우선순위를 드립니다."
  }
];

function cta(label: string, target: string, secondary = false) {
  return (
    <Link
      href="/apply"
      className={`cta ${secondary ? "secondary" : ""}`}
      onClick={() => track({ event_name: "cta_click", event_target: target, metadata: { label } })}
    >
      {label}
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <BehaviorTracker />
      <main>
        <section className="section" data-track-id="hero">
          <div className="container">
            <span className="badge">Big Tech Recruiter Fit Check · 베타 모집</span>
            <h1 data-track-id="hero_headline">빅테크 리크루터가 취업 실패 이유를 진단해드립니다.</h1>
            <p className="muted" style={{ fontSize: 20, maxWidth: 720 }}>
              서류 탈락, 면접 전환 실패, 포지션 매칭 문제를 리크루터 관점으로 분석하고 다음 지원 전에 고칠 포인트를 알려드립니다.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
              {cta("₩49,000 진단권 신청하기", "hero_primary")}
              {cta("진단 방식 보기", "hero_secondary", true)}
            </div>
          </div>
        </section>

        <section className="section" data-track-id="pain_points">
          <div className="container grid grid-3">
            {sections.map((s, i) => (
              <article className="card" data-track-id={`pain_card_${i + 1}`} key={s.title}>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" data-track-id="process">
          <div className="container grid grid-2">
            <div>
              <h2>이력서를 더 예쁘게 만드는 게 아니라, 채용자가 읽는 순서대로 다시 봅니다.</h2>
              <p className="muted">
                지원 직무, 현재 이력서, 최근 탈락 경험을 기반으로 문제를 진단합니다. 결과는 이메일 리포트 또는 20분 콜 형태로 제공될 예정입니다.
              </p>
            </div>
            <div className="card" data-track-id="diagnosis_image_placeholder">
              <div style={{ aspectRatio: "4/3", borderRadius: 20, background: "linear-gradient(135deg, rgba(124,58,237,.35), rgba(34,197,94,.18))", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
                <strong>Recruiter Review Preview</strong>
                <span className="muted">여기 이미지/샘플 리포트가 고객 체류 분석 대상입니다.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" data-track-id="offer">
          <div className="container">
            <div className="card grid grid-2">
              <div>
                <h2>베타 진단권</h2>
                <p className="muted">정식 오픈 전 신청자에게 우선권과 할인 링크를 보내드립니다.</p>
                <div className="price">₩49,000</div>
                <p className="muted">실제 결제는 아직 진행되지 않습니다. 신청 완료가 구매 의사 지표로 기록됩니다.</p>
              </div>
              <div style={{ display: "grid", gap: 12, alignContent: "center" }}>
                {cta("베타 진단 신청하기", "offer_primary")}
                {cta("가격 고민 중이지만 알림 받기", "offer_secondary", true)}
              </div>
            </div>
          </div>
        </section>

        <section className="section" data-track-id="faq">
          <div className="container">
            <h2>자주 묻는 질문</h2>
            <div className="grid grid-2">
              <div className="card" data-track-id="faq_1"><h3>누가 보면 좋나요?</h3><p className="muted">해외/국내 빅테크, 스타트업, 글로벌 포지션에 지원 중인데 서류나 면접 전환이 낮은 분에게 적합합니다.</p></div>
              <div className="card" data-track-id="faq_2"><h3>개인정보는 어떻게 쓰나요?</h3><p className="muted">신청 안내와 진단 준비 목적으로만 사용합니다. 이력서 링크는 선택 입력입니다.</p></div>
            </div>
          </div>
        </section>
      </main>
      <div className="sticky-cta">
        {cta("진단 신청하기", "mobile_sticky")}
      </div>
    </>
  );
}
