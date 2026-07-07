/**
 * Career Compass Jobs Backend
 * Zero-dependency Node.js (>=18) server.
 * 실행: node server.js  (기본 포트 8787)
 *
 * 엔드포인트:
 *   GET /api/health            → 상태 + 활성화된 소스 목록
 *   GET /api/roles             → 직무 DB (fortune500-roles.json)
 *   GET /api/jobs?q=data+analyst&qko=데이터 분석가&limit=10
 *       → 소스 통합 공고 목록 (사람인/원티드/Remotive/Jobicy)
 *
 * 환경변수 (.env 파일 지원 — 같은 폴더에 .env 두면 자동 로드):
 *   SARAMIN_API_KEY   사람인 오픈 API 키 (https://oapi.saramin.co.kr) — 없으면 사람인 소스 비활성
 *   ENABLE_WANTED     "1"이면 원티드 비공식 내부 API 프록시 활성 (기본 1)
 *   PORT              기본 8787
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

// ---- tiny .env loader ----
try {
  const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  env.split("\n").forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (e) {}

const PORT = Number(process.env.PORT || 8787);
const SARAMIN_KEY = process.env.SARAMIN_API_KEY || "";
const ENABLE_WANTED = (process.env.ENABLE_WANTED ?? "1") === "1";

// ---- roles DB ----
function loadRoles() {
  for (const p of [path.join(__dirname, "..", "fortune500-roles.json"), path.join(__dirname, "fortune500-roles.json")]) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
  }
  return null;
}
const ROLES_DB = loadRoles();

// ---- cache (in-memory, TTL 10분) ----
const cache = new Map();
const TTL = 10 * 60 * 1000;
function cacheGet(k) { const v = cache.get(k); if (v && Date.now() - v.t < TTL) return v.d; cache.delete(k); return null; }
function cacheSet(k, d) { cache.set(k, { t: Date.now(), d }); }

// ---- fetch helpers (timeout) ----
async function jfetch(url, opts = {}, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: c.signal, headers: { "user-agent": "career-compass/0.1", accept: "application/json", ...(opts.headers || {}) } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally { clearTimeout(t); }
}
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
async function hfetch(url, ms = 10000) { // HTML fetch (브라우저 흉내)
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const res = await fetch(url, { signal: c.signal, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "ko-KR,ko;q=0.9" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}
// HTML 태그 제거 + 엔티티 디코드
function txt(s) {
  return String(s).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
// 앵커 패턴 스크레이퍼: 공고 상세 URL 패턴으로 [{url,title}] 추출 (셀렉터 의존 X → 리디자인에 강함)
function extractAnchors(html, hrefPattern, base, max = 8) {
  const re = new RegExp(`<a\\b[^>]*href=["']([^"']*${hrefPattern}[^"']*)["'][^>]*>([\\s\\S]*?)<\\/a>`, "gi");
  const out = []; const seen = new Set(); let m;
  while ((m = re.exec(html)) && out.length < max * 3) {
    let href = m[1].replace(/&amp;/g, "&");
    if (href.startsWith("/")) href = base + href;
    if (!href.startsWith("http")) continue;
    const titleAttr = (m[0].match(/title=["']([^"']+)["']/) || [])[1];
    const title = txt(titleAttr || m[2]);
    const key = href.split("#")[0];
    if (title.length < 4 || seen.has(key)) continue;
    seen.add(key); out.push({ url: key, title });
  }
  return out.slice(0, max);
}

// ---- source adapters → [{source,title,company,location,url,posted,salary}] ----
const adapters = {
  // 사람인 오픈 API (공식) — 키 필요: https://oapi.saramin.co.kr
  async saramin({ qko }) {
    if (!SARAMIN_KEY) return [];
    const u = `https://oapi.saramin.co.kr/job-search?access-key=${encodeURIComponent(SARAMIN_KEY)}&keywords=${encodeURIComponent(qko)}&count=10&sort=pd`;
    const d = await jfetch(u);
    const jobs = d?.jobs?.job || [];
    return (Array.isArray(jobs) ? jobs : [jobs]).map(j => ({
      source: "사람인", title: j?.position?.title || "", company: j?.company?.detail?.name || "",
      location: j?.position?.location?.name || "", url: j?.url || "",
      posted: j?.["posting-timestamp"] ? new Date(Number(j["posting-timestamp"]) * 1000).toISOString() : null,
      salary: j?.salary?.name || null
    })).filter(j => j.title && j.url);
  },
  // 원티드 내부 API (비공식 — 변경/차단 가능성 있음. 프로덕션은 제휴 권장)
  async wanted({ qko }) {
    if (!ENABLE_WANTED) return [];
    const u = `https://www.wanted.co.kr/api/v4/jobs?query=${encodeURIComponent(qko)}&country=kr&job_sort=job.latest_order&locations=all&years=0&limit=10`;
    const d = await jfetch(u, { headers: { referer: "https://www.wanted.co.kr/" } });
    return (d?.data || []).map(j => ({
      source: "원티드", title: j?.position || "", company: j?.company?.name || "",
      location: j?.address?.location || "한국", url: j?.id ? `https://www.wanted.co.kr/wd/${j.id}` : "",
      posted: null, salary: null
    })).filter(j => j.title && j.url);
  },
  // Remotive (공식 공개 API, 글로벌 원격)
  async remotive({ q }) {
    const d = await jfetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=5`);
    return (d?.jobs || []).map(j => ({
      source: "Remotive", title: j.title, company: j.company_name,
      location: j.candidate_required_location || "Remote", url: j.url, posted: j.publication_date || null, salary: j.salary || null
    }));
  },
  // Jobicy (공식 공개 API, 글로벌 원격)
  async jobicy({ q }) {
    const d = await jfetch(`https://jobicy.com/api/v2/remote-jobs?count=50`);
    const words = q.toLowerCase().split(" ");
    return (d?.jobs || []).filter(j => words.some(w => j.jobTitle.toLowerCase().includes(w))).slice(0, 5)
      .map(j => ({ source: "Jobicy", title: j.jobTitle, company: j.companyName, location: j.jobGeo || "Remote", url: j.url, posted: j.pubDate || null, salary: null }));
  },
  // ---- 이하 스크레이핑 어댑터 (API 없음 → HTML 파싱, 프로토타입용. ToS 확인 후 프로덕션 적용) ----
  // 잡코리아: 검색 결과 페이지에서 공고 상세 링크(/Recruit/GI_Read/{id}) 추출
  async jobkorea_scrape({ qko }) {
    if (process.env.DISABLE_SCRAPERS === "1") return [];
    const html = await hfetch(`https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(qko)}`);
    return extractAnchors(html, "\\/Recruit\\/GI_Read\\/\\d+", "https://www.jobkorea.co.kr")
      .map(a => ({ source: "잡코리아", title: a.title, company: "", location: "한국", url: a.url, posted: null, salary: null }));
  },
  // 사람인(페이지): API 승인 전 임시 — rec_idx= 패턴 추출. SARAMIN_API_KEY 설정 시 자동 비활성
  async saramin_scrape({ qko }) {
    if (SARAMIN_KEY || process.env.DISABLE_SCRAPERS === "1") return [];
    const html = await hfetch(`https://www.saramin.co.kr/zf_user/search/recruit?searchType=search&searchword=${encodeURIComponent(qko)}&recruitPageCount=15`);
    const seen = new Set(); // rec_idx 기준 중복 제거 + 잡음 제목 필터
    return extractAnchors(html, "rec_idx=\\d+", "https://www.saramin.co.kr", 20)
      .filter(a => a.url.includes("/relay/") || a.url.includes("view"))
      .filter(a => !/^(홈페이지 지원|즉시 지원|스크랩|입사지원)/.test(a.title))
      .filter(a => { const id = (a.url.match(/rec_idx=(\d+)/) || [])[1]; if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .slice(0, 8)
      .map(a => ({ source: "사람인", title: a.title, company: "", location: "한국", url: a.url, posted: null, salary: null }));
  },
  // 자소설닷컴: Next.js __NEXT_DATA__ JSON에서 채용 객체 추출, 실패 시 앵커 패턴
  async jasoseol_scrape({ qko }) {
    if (process.env.DISABLE_SCRAPERS === "1") return [];
    const html = await hfetch(`https://jasoseol.com/search?keyword=${encodeURIComponent(qko)}`);
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    const out = [];
    if (m) {
      try {
        const walk = o => {
          if (!o || typeof o !== "object" || out.length >= 8) return;
          if (Array.isArray(o)) return o.forEach(walk);
          const title = o.title || o.recruit_title || o.name;
          const id = o.id || o.recruit_id;
          const co = o.company_name || (o.company && o.company.name);
          if (title && id && co && typeof title === "string") {
            out.push({ source: "자소설닷컴", title: txt(title), company: txt(String(co)), location: "한국", url: `https://jasoseol.com/recruit/${id}`, posted: o.start_time || null, salary: null });
          }
          Object.values(o).forEach(walk);
        };
        walk(JSON.parse(m[1]));
      } catch (e) {}
    }
    if (out.length) return out.slice(0, 8);
    return extractAnchors(html, "\\/recruit\\/\\d+", "https://jasoseol.com")
      .map(a => ({ source: "자소설닷컴", title: a.title, company: "", location: "한국", url: a.url, posted: null, salary: null }));
  },
  // 피플앤잡(외국계): /jobs/{id} 앵커 패턴
  async peoplenjob_scrape({ qko }) {
    if (process.env.DISABLE_SCRAPERS === "1") return [];
    const html = await hfetch(`https://www.peoplenjob.com/jobs?q=${encodeURIComponent(qko)}`);
    return extractAnchors(html, "\\/jobs\\/\\d+", "https://www.peoplenjob.com")
      .map(a => ({ source: "피플앤잡", title: a.title, company: "", location: "한국", url: a.url, posted: null, salary: null }));
  }
};

async function getJobs(q, qko, limit) {
  const key = `jobs:${q}:${qko}`;
  const hit = cacheGet(key);
  if (hit) return { cached: true, ...hit };
  const names = Object.keys(adapters);
  const settled = await Promise.allSettled(names.map(n => adapters[n]({ q, qko })));
  const jobs = []; const sources = {};
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") { sources[names[i]] = s.value.length; jobs.push(...s.value); }
    else sources[names[i]] = "error: " + (s.reason?.message || s.reason);
  });
  // URL dedupe 후, 한국 소스 우선 순서로 소스별 라운드로빈(다양성 확보)
  const seen = new Set();
  const rank = { "사람인": 0, "원티드": 1, "잡코리아": 2, "자소설닷컴": 3, "피플앤잡": 4, "Remotive": 5, "Jobicy": 6 };
  const uniq = jobs.filter(j => !seen.has(j.url) && seen.add(j.url));
  const groups = [...new Set(uniq.map(j => j.source))]
    .sort((a, b) => (rank[a] ?? 9) - (rank[b] ?? 9))
    .map(s => uniq.filter(j => j.source === s));
  const out = [];
  for (let i = 0; out.length < limit; i++) {
    let added = false;
    for (const g of groups) { if (g[i]) { out.push(g[i]); added = true; if (out.length >= limit) break; } }
    if (!added) break;
  }
  const data = { count: out.length, sources, jobs: out };
  cacheSet(key, data);
  return { cached: false, ...data };
}

// ---- server ----
function send(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "*" });
  res.end(JSON.stringify(obj));
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, {});
  try {
    if (url.pathname === "/api/health") {
      const scr = process.env.DISABLE_SCRAPERS === "1" ? "disabled" : "enabled (스크레이핑)";
      return send(res, 200, { ok: true, sources: { saramin: SARAMIN_KEY ? "enabled (공식 API)" : "fallback " + scr + " — API 승인 후 자동 전환", wanted: ENABLE_WANTED ? "enabled (비공식 API)" : "disabled", jobkorea: scr, jasoseol: scr, peoplenjob: scr, remotive: "enabled", jobicy: "enabled" } });
    }
    // 스크레이퍼 진단: /api/debug?site=jobkorea_scrape&q=데이터 분석가
    if (url.pathname === "/api/debug") {
      const site = url.searchParams.get("site"), q = url.searchParams.get("q") || "데이터 분석가";
      if (!adapters[site]) return send(res, 400, { error: "site 값: " + Object.keys(adapters).join(", ") });
      try { const jobs = await adapters[site]({ q, qko: q }); return send(res, 200, { site, q, count: jobs.length, jobs }); }
      catch (e) { return send(res, 200, { site, q, error: String(e?.message || e) }); }
    }
    // 컨설팅 신청(결제 클릭) 저장: POST /api/leads {name,email,targetRole,msg,stage,fit}
    if (url.pathname === "/api/leads" && req.method === "POST") {
      let body = "";
      req.on("data", c => { body += c; if (body.length > 100_000) req.destroy(); });
      req.on("end", () => {
        try {
          const d = JSON.parse(body || "{}");
          if (!d.name || !d.email) return send(res, 400, { error: "name, email 필수" });
          const lead = { ts: new Date().toISOString(), name: String(d.name).slice(0, 100), email: String(d.email).slice(0, 200), targetRole: String(d.targetRole || "").slice(0, 100), msg: String(d.msg || "").slice(0, 2000), stage: String(d.stage || "").slice(0, 30), fit: String(d.fit || "").slice(0, 5), price: "500000", source: "consulting" };
          fs.appendFileSync(path.join(__dirname, "leads.jsonl"), JSON.stringify(lead) + "\n");
          console.log("새 신청:", lead.name, lead.email, lead.targetRole);
          send(res, 200, { ok: true });
        } catch (e) { send(res, 400, { error: "invalid json" }); }
      });
      return;
    }
    // 신청 목록 조회 (운영자용): GET /api/leads
    if (url.pathname === "/api/leads") {
      try {
        const lines = fs.readFileSync(path.join(__dirname, "leads.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
        return send(res, 200, { count: lines.length, leads: lines });
      } catch (e) { return send(res, 200, { count: 0, leads: [] }); }
    }
    if (url.pathname === "/api/roles") {
      return ROLES_DB ? send(res, 200, ROLES_DB) : send(res, 500, { error: "fortune500-roles.json not found" });
    }
    if (url.pathname === "/api/jobs") {
      let q = url.searchParams.get("q") || "";
      let qko = url.searchParams.get("qko") || "";
      const roleId = url.searchParams.get("roleId");
      if (roleId && ROLES_DB) {
        const r = ROLES_DB.roles.find(x => String(x.id) === roleId);
        if (r) { q = q || r.search_query; qko = qko || r.search_query_ko; }
      }
      if (!q && !qko) return send(res, 400, { error: "q, qko 또는 roleId 필요" });
      q = q || qko; qko = qko || q;
      const limit = Math.min(Number(url.searchParams.get("limit") || 10), 30);
      return send(res, 200, await getJobs(q, qko, limit));
    }
    send(res, 404, { error: "not found. GET /api/health, /api/roles, /api/jobs" });
  } catch (e) { send(res, 500, { error: String(e?.message || e) }); }
}).listen(PORT, () => console.log(`Career Compass backend → http://localhost:${PORT}  (health: /api/health)`));
