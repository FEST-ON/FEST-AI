import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, beforeEach, test } from "node:test";
import ts from "typescript";

async function importTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const { adminApi, logoutAdmin } = await importTypeScript("../src/shared/lib/api.ts");
const { hasSurveyAnswer, surveyQuestionType } = await importTypeScript("../src/entities/visitor/model.ts");
const { classifyTicket, nextTicketStatus } = await importTypeScript("../src/entities/ticket/model.ts");

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
