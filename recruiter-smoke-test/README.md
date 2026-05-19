# Recruiter Smoke Test Landing

빅테크 리크루터 취업 실패 진단 서비스용 smoke test MVP입니다.

## 포함 기능

- 유입 경로 추적: UTM, referrer, landing page 저장
- 페이지 내 행동 분석: 섹션별 체류 시간, 스크롤 깊이, CTA 클릭
- 전환 시간 측정: 최초 방문 → CTA/폼/신청완료까지 걸린 시간
- 리드 저장: Supabase `leads`
- 이벤트 저장: Supabase `events`
- GA4 이벤트 전송
- Microsoft Clarity 삽입 가능

## 빠른 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 환경변수

`.env.local`에 아래 값을 넣으세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
```

GA4/Clarity는 비워도 앱은 동작합니다. Supabase를 연결하지 않으면 콘솔에만 이벤트가 찍힙니다.

## Supabase SQL

Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행하세요.

## 배포

Vercel에 GitHub repo를 연결하고 위 환경변수를 Vercel Project Settings에 추가하세요.
