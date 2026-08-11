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

test("백엔드 설문 타입과 답변 유무를 명시적으로 처리한다", () => {
  assert.equal(surveyQuestionType("SINGLE_CHOICE"), "single_choice");
  assert.equal(surveyQuestionType("MULTIPLE_CHOICE"), "multiple_choice");
  assert.equal(hasSurveyAnswer([]), false);
  assert.equal(hasSurveyAnswer(["공연"]), true);
  assert.throws(() => surveyQuestionType("UNKNOWN"));
});
