import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, beforeEach, test } from "node:test";
import ts from "typescript";

const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

// `imports`로 `@/...` 별칭을 이미 만들어 둔 모듈 URL에 연결하면 같은 모듈 인스턴스를 공유한다.
async function transpile(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [specifier, url] of Object.entries(imports)) output = output.replaceAll(`"${specifier}"`, `"${url}"`);
  return moduleUrl(output);
}

async function importTypeScript(path, imports) {
  return import(await transpile(path, imports));
}

const apiUrl = await transpile("../src/shared/lib/api.ts");
const { adminApi, adminFestivalId, logoutAdmin } = await import(apiUrl);
const { generateReply } = await importTypeScript("../src/features/ai-guide/lib/generate-reply.ts", {
  "@/shared/lib/api": apiUrl,
  "@/shared/lib/i18n": moduleUrl('export const BCP47_BY_LOCALE = { ko: "ko-KR" };'),
});
const { hasSurveyAnswer, surveyQuestionType } = await importTypeScript("../src/entities/visitor/model.ts");
const { classifyTicket, nextTicketStatus } = await importTypeScript("../src/entities/ticket/model.ts");
const { canClose, validatePublishInput } = await importTypeScript("../src/entities/announcement/model.ts");
const { contentAction, contentPreview } = await importTypeScript("../src/features/content-review/model/content.ts");
const { canAccessPath, visibleNavItems } = await importTypeScript("../src/shared/lib/permissions.ts");
const { translateFields } = await importTypeScript("../src/shared/lib/i18n/translate-client.ts");

class MemoryStorage {
  #values = new Map();

  get length() { return this.#values.size; }
  clear() { this.#values.clear(); }
  getItem(key) { return this.#values.get(key) ?? null; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  removeItem(key) { this.#values.delete(key); }
  setItem(key, value) { this.#values.set(key, String(value)); }
}

const originalFetch = globalThis.fetch;
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });

beforeEach(() => localStorage.clear());
after(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
});

test("동시 401 응답은 refresh token을 한 번만 갱신한다", async () => {
  localStorage.setItem("festai-admin-access", "expired-access");
  localStorage.setItem("festai-admin-refresh", "rt_current");
  let refreshCalls = 0;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const authorization = new Headers(init.headers).get("Authorization");
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return Response.json({ data: { accessToken: "fresh-access", refreshToken: "rt_next" } });
    }
    if (authorization === "Bearer expired-access") {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return Response.json({ error: { message: "만료됨" } }, { status: 401 });
    }
    return Response.json({ data: url });
  };

  await Promise.all([adminApi("/first"), adminApi("/second")]);
  assert.equal(refreshCalls, 1);
  assert.equal(localStorage.getItem("festai-admin-refresh"), "rt_next");
});

test("로그아웃은 서버 refresh token을 폐기하고 로컬 세션을 지운다", async () => {
  localStorage.setItem("festai-admin-access", "access");
  localStorage.setItem("festai-admin-refresh", "rt_current");
  localStorage.setItem("festai-admin-festival-id", "festival");
  let logoutBody;

  globalThis.fetch = async (_input, init = {}) => {
    logoutBody = JSON.parse(String(init.body));
    return new Response(null, { status: 204 });
  };

  await logoutAdmin();
  assert.deepEqual(logoutBody, { refreshToken: "rt_current" });
  assert.equal(localStorage.length, 0);
});

test("로그아웃 후 늦게 끝난 token refresh는 세션을 복구하지 않는다", async () => {
  localStorage.setItem("festai-admin-access", "expired-access");
  localStorage.setItem("festai-admin-refresh", "rt_current");
  let finishRefresh;
  let notifyRefreshStarted;
  const refreshStarted = new Promise((resolve) => { notifyRefreshStarted = resolve; });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      notifyRefreshStarted();
      return new Promise((resolve) => { finishRefresh = resolve; });
    }
    if (url.endsWith("/auth/logout")) return new Response(null, { status: 204 });
    return Response.json({ error: { message: "만료됨" } }, { status: 401 });
  };

  const request = adminApi("/private");
  await refreshStarted;
  await logoutAdmin();
  finishRefresh(Response.json({ data: { accessToken: "late-access", refreshToken: "rt_late" } }));

  await assert.rejects(request);
  assert.equal(localStorage.length, 0);
});

test("축제 코드가 일치하지 않으면 다른 축제를 대신 선택하지 않는다", async () => {
  localStorage.setItem("festai-admin-access", "access");
  const requests = [];

  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return Response.json({ data: [{ id: "other-festival", code: "OTHER-2026" }] });
  };

  await assert.rejects(adminFestivalId(), /EST34-2026/);
  assert.deepEqual(requests, ["/api/backend/admin/festivals"], "데이터를 바꾸는 요청은 보내지 않는다");
  assert.equal(localStorage.getItem("festai-admin-festival-id"), null, "잘못된 축제 ID를 캐시하지 않는다");
});

test("축제 ID는 접근 가능한 목록에서 확인하고 로그아웃하면 다시 확인한다", async () => {
  localStorage.setItem("festai-admin-access", "access");
  localStorage.setItem("festai-admin-refresh", "rt_current");
  let lookups = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/logout")) return new Response(null, { status: 204 });
    lookups += 1;
    return Response.json({ data: [{ id: "festival-1", code: "EST34-2026" }] });
  };

  assert.equal(await adminFestivalId(), "festival-1");
  assert.equal(await adminFestivalId(), "festival-1");
  assert.equal(lookups, 1, "같은 세션에서는 한 번만 조회한다");

  await logoutAdmin();
  localStorage.setItem("festai-admin-access", "other-access");
  assert.equal(await adminFestivalId(), "festival-1");
  assert.equal(lookups, 2, "세션이 바뀌면 접근 가능한 축제를 다시 확인한다");
});

test("방문자 세션이 재발급되면 AI 대화를 새로 만들고 404는 한 번만 복구한다", async () => {
  localStorage.setItem("festai-visitor-token", "v1");
  let validToken = "v1";
  let created = 0;
  let answered = 0;
  let alwaysMissing = false;
  const owner = new Map();

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/visitor-sessions")) {
      validToken = "v2";
      return Response.json({ data: { sessionToken: "v2" } });
    }
    if (new Headers(init.headers).get("Authorization") !== `Bearer ${validToken}`) {
      return Response.json({ error: { message: "세션이 만료되었습니다." } }, { status: 401 });
    }
    if (url.endsWith("/visitor/ai/conversations")) {
      created += 1;
      const id = `c${created}`;
      owner.set(id, validToken);
      return Response.json({ data: { id } });
    }
    const conversation = url.match(/conversations\/(c\d+)\/messages$/)?.[1];
    if (alwaysMissing || owner.get(conversation) !== validToken) {
      return Response.json({ error: { message: "대화를 찾을 수 없습니다." } }, { status: 404 });
    }
    answered += 1;
    return Response.json({ data: { messageId: `m${answered}`, answer: "안내 답변", sources: [] } });
  };

  assert.equal((await generateReply("첫 질문", "ko")).content, "안내 답변");
  assert.equal(created, 1);

  // 방문자 토큰 만료 → 새 세션이 발급되면 이전 대화(c1)는 서버에 없다.
  validToken = "expired";
  assert.equal((await generateReply("두 번째 질문", "ko")).content, "안내 답변");
  assert.equal(created, 2, "새 세션에서는 대화를 새로 연다");
  assert.equal(localStorage.getItem("festai-visitor-token"), "v2");

  alwaysMissing = true;
  const before = created;
  await assert.rejects(generateReply("세 번째 질문", "ko"), /대화를 찾을 수 없습니다/);
  assert.equal(created - before, 1, "복구는 한 번만 시도한다");
});

test("백엔드 설문 타입과 답변 유무를 명시적으로 처리한다", () => {
  assert.equal(surveyQuestionType("SINGLE_CHOICE"), "single_choice");
  assert.equal(surveyQuestionType("MULTIPLE_CHOICE"), "multiple_choice");
  assert.equal(hasSurveyAnswer([]), false);
  assert.equal(hasSurveyAnswer(["공연"]), true);
  assert.throws(() => surveyQuestionType("UNKNOWN"));
});

test("백엔드 티켓 텍스트를 운영 카테고리로 자동 분류한다", () => {
  assert.equal(classifyTicket("체험존 미끄럼 사고", "안전 표지 설치", "사고"), "안전·사고");
  assert.equal(classifyTicket("다회용기 반납 위치", "안내가 필요합니다", "민원"), "ESG운영");
  assert.equal(classifyTicket("셔틀버스 지연", "교통 문의", "민원"), "교통");
});

test("운영 티켓은 배정부터 완료까지 순서대로 전이한다", () => {
  assert.equal(nextTicketStatus("OPEN"), "ASSIGNED");
  assert.equal(nextTicketStatus("ASSIGNED"), "IN_PROGRESS");
  assert.equal(nextTicketStatus("IN_PROGRESS"), "RESOLVED");
  assert.equal(nextTicketStatus("RESOLVED"), "CLOSED");
  assert.equal(nextTicketStatus("CLOSED"), undefined);
});

test("공지 발행 입력은 서버에 보내기 전에 걸러내고, 종료는 노출 중인 공지만 허용한다", () => {
  const base = { title: "우천 안내", audience: ["VISITOR"], startsAt: "2026-08-14T10:00", endsAt: "" };
  assert.equal(validatePublishInput(base), null);
  assert.match(validatePublishInput({ ...base, title: "  " }), /공지 내용/);
  assert.match(validatePublishInput({ ...base, audience: [] }), /노출 대상/);
  assert.match(validatePublishInput({ ...base, startsAt: "" }), /노출 시작/);
  assert.match(validatePublishInput({ ...base, endsAt: "2026-08-14T09:00" }), /노출 시작 이후/);
  assert.equal(validatePublishInput({ ...base, endsAt: "2026-08-14T11:00" }), null);

  assert.equal(canClose("ACTIVE"), true);
  assert.equal(canClose("SCHEDULED"), true);
  assert.equal(canClose("DRAFT"), false);
  assert.equal(canClose("CLOSED"), false);
  assert.equal(canClose("EXPIRED"), false);
});

test("콘텐츠 버전 상태에 맞는 다음 검수·게시 동작을 고른다", () => {
  assert.equal(contentAction("DRAFT", false), "SUBMIT");
  assert.equal(contentAction("IN_REVIEW", false), "REVIEW");
  assert.equal(contentAction("APPROVED", false), "PUBLISH");
  assert.equal(contentAction("APPROVED", true), "UNPUBLISH");
  assert.equal(contentAction("REJECTED", false), undefined);
  assert.equal(contentPreview({ summary: "축제 요약" }), "축제 요약");
});

test("검수자는 검수가 필요한 화면에 모두 접근할 수 있다", () => {
  // 백엔드가 REVIEWER에게 열어둔 화면들 — 하나라도 막히면 검수자가 일을 못 한다
  for (const path of ["/admin/content", "/admin/ai-insights", "/admin/esg"]) {
    assert.equal(canAccessPath("REVIEWER", path), true, path);
  }
  assert.equal(canAccessPath("REVIEWER", "/admin/audit-logs"), false);
  assert.deepEqual(
    visibleNavItems("REVIEWER").map((item) => item.href),
    ["/admin", "/admin/content", "/admin/ai-insights", "/admin/esg"],
  );
});

test("자동 번역은 항목별 필드를 한 번의 요청으로 묶고, 실패하면 원문을 유지한다", async () => {
  const spots = [
    { id: "st1", name: "통합 안내소", location: "정문 입구", collected: true },
    { id: "st2", name: "그린마켓", location: "마켓존", collected: false },
  ];
  let requests = 0;

  globalThis.fetch = async (_input, init = {}) => {
    requests += 1;
    const { entries } = JSON.parse(String(init.body));
    return Response.json({ entries: Object.fromEntries(Object.keys(entries).map((key) => [key, `EN:${entries[key]}`])) });
  };

  assert.deepEqual(await translateFields(spots, ["name", "location"], "ko"), spots, "한국어는 요청하지 않는다");
  assert.equal(requests, 0);

  const translated = await translateFields(spots, ["name", "location"], "en");
  assert.equal(requests, 1, "항목이 여러 개여도 요청은 한 번");
  assert.deepEqual(translated[0], { id: "st1", name: "EN:통합 안내소", location: "EN:정문 입구", collected: true });
  assert.equal(translated[1].collected, false, "번역 대상이 아닌 필드는 그대로 둔다");

  globalThis.fetch = async () => { throw new Error("network down"); };
  assert.deepEqual(await translateFields(spots, ["name"], "en"), spots, "실패하면 원문으로 fallback");
});

test("역할이 없으면 관리자 화면에 접근할 수 없다", () => {
  assert.equal(canAccessPath(undefined, "/admin"), false);
  assert.equal(canAccessPath("MERCHANT", "/admin/audit-logs"), false);
});
