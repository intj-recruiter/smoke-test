# Career Compass Jobs Backend

한국 잡사이트 + 글로벌 원격 공고를 하나의 API로 통합하는 백엔드. 의존성 0개, Node 18+만 있으면 됩니다.

## 실행

```bash
cd backend
cp .env.example .env    # 키 입력 (아래 "직접 신청해야 하는 것" 참고)
node server.js          # → http://localhost:8787
```

프런트엔드(career-compass.html)는 백엔드가 켜져 있으면 자동으로 이 API를 쓰고, 없으면 기존 방식(Remotive/Jobicy 직접 호출 + 검색 링크)으로 동작합니다.

## API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/health` | 소스별 활성화 상태 확인 |
| `GET /api/roles` | 직무 DB (fortune500-roles.json) |
| `GET /api/jobs?roleId=6` | 직무 id로 통합 공고 조회 |
| `GET /api/jobs?q=data analyst&qko=데이터 분석가&limit=10` | 키워드 직접 조회 |

응답: `{count, sources: {소스별 건수/에러}, jobs: [{source,title,company,location,url,posted,salary}]}` — 한국 소스 우선 정렬, URL 중복 제거, 10분 캐시.

## 직접 신청해야 하는 것 (사용자 액션)

### 1. 사람인 오픈 API 키 — 지금 바로 필요 ✅
6개 사이트 중 유일한 공식 공개 API입니다.
- 신청: **https://oapi.saramin.co.kr** → 회원가입 → 마이페이지에서 access-key 발급 (무료)
- 발급받은 키를 `.env`의 `SARAMIN_API_KEY=`에 붙여넣고 서버 재시작
- 문서: https://oapi.saramin.co.kr/guide (job-search API 사용)

### 2. 원티드 — 당장은 신청 불필요, 프로덕션 전 제휴 권장 ⚠️
- 현재: 비공식 내부 API(`wanted.co.kr/api/v4/jobs`)를 백엔드가 프록시 (기본 활성, `.env`의 `ENABLE_WANTED=0`으로 끔)
- 비공식이라 예고 없이 차단/변경될 수 있음. 정식 런칭 전 제휴 문의: **https://www.wanted.co.kr/business** 또는 https://www.wantedlab.com 비즈니스 제휴 채널

### 3. 잡코리아 / 자소설닷컴 / 피플앤잡 — 공식 API 없음 → 스크레이핑 어댑터 내장 ✅ (임시)
사람인 API 승인 대기 중에도 동작하도록 HTML 스크레이핑 어댑터가 들어 있습니다:
- **잡코리아·피플앤잡**: 검색 결과에서 공고 상세 URL 패턴 추출 (셀렉터 비의존 → 리디자인에 강함)
- **자소설닷컴**: `__NEXT_DATA__` JSON 파싱 (회사명 포함), 실패 시 URL 패턴 폴백
- **사람인(임시)**: 페이지 스크레이핑 — `.env`에 `SARAMIN_API_KEY` 입력하면 자동으로 공식 API로 전환
- 진단: `GET /api/debug?site=jobkorea_scrape&q=데이터 분석가` 로 소스별 파싱 결과 확인. 끄기: `.env`에 `DISABLE_SCRAPERS=1`
- ⚠️ 스크레이핑은 프로토타입용입니다. 각 사이트 ToS 확인 및 요청 빈도 제한(현재 10분 캐시) 유지, 프로덕션은 제휴/API 전환 권장.

장기적으로는 아래 선택지:
- **제휴/광고 API 문의**: 잡코리아 비즈니스 https://www.jobkorea.co.kr/service/business , 자소설닷컴 기업서비스 https://jasoseol.com/business , 피플앤잡 https://www.peoplenjob.com (고객센터 경유)
- **스크레이핑 인프라 연결**: Bright Data(https://brightdata.com) 또는 Nimble(https://nimbleway.com) 가입 후 API 키 발급 → 알려주시면 어댑터를 작성해 드립니다. Cowork에 두 플러그인이 이미 설치돼 있어 claude.ai 커넥터 설정에서 인증만 하면 세션 내 테스트도 가능합니다.
- **대안 애그리게이터**: SerpAPI Google Jobs(https://serpapi.com, `gl=kr` 한국 공고 포함, 유료) 또는 JSearch(RapidAPI)

### 4. LinkedIn — 신청 불가에 가까움
공식 Job Search API는 파트너 전용(https://developer.linkedin.com). 검색 딥링크 방식 유지가 현실적입니다.

## 배포

로컬 확인 후 아무 Node 호스팅에 올리면 됩니다: Railway/Render/Fly.io(그대로 `node server.js`), 또는 Cloudflare Workers로 포팅(원하시면 변환해 드립니다). 배포 후 career-compass.html 상단의 `BACKEND` 상수를 배포 URL로 바꾸세요.

## 로드맵 제안
1. 사람인 키 연동 → 국내 공고 실데이터 확보 (오늘 가능)
2. Bright Data/Nimble 인증 → 잡코리아·자소설·피플앤잡 어댑터 추가
3. 공고 결과에 직무 매칭 점수 결합, 신입 필터(경력 0~1년) 적용
4. 크론으로 주기 수집 → DB 저장(SQLite) → 응답 속도/안정성 개선
