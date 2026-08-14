const API_BASE = "/api/backend";

export const FESTIVAL_CODE = process.env.NEXT_PUBLIC_FESTIVAL_CODE ?? "EST34-2026";

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

const ADMIN_ACCESS = "festai-admin-access";
const ADMIN_REFRESH = "festai-admin-refresh";
const VISITOR_TOKEN = "festai-visitor-token";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
    throw new ApiError(body.error?.message ?? "서버 요청에 실패했습니다.", response.status);
  }
  if (response.status === 204) return undefined as T;
  return ((await response.json()) as ApiEnvelope<T>).data;
}

export function publicApi<T>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

let visitorSession: Promise<string> | undefined;
let visitorGeneration = 0;

// 세션이 재발급되면 이전 세션에 매달린 서버 리소스(AI 대화 등)는 더 이상 쓸 수 없다.
export function visitorSessionGeneration() {
  return visitorGeneration;
}

function visitorToken(): Promise<string> {
  const stored = localStorage.getItem(VISITOR_TOKEN);
  if (stored) return Promise.resolve(stored);
  visitorSession ??= api<{ sessionToken: string }>(`/public/festivals/${FESTIVAL_CODE}/visitor-sessions`, {
    method: "POST",
    body: JSON.stringify({ language: "ko", accessibilityPreferences: {}, consents: {} }),
  }).then(({ sessionToken }) => {
    visitorGeneration += 1;
    localStorage.setItem(VISITOR_TOKEN, sessionToken);
    return sessionToken;
  }).finally(() => { visitorSession = undefined; });
  return visitorSession;
}

export async function visitorApi<T>(path: string, init?: RequestInit): Promise<T> {
  let token = await visitorToken();
  try {
    return await api<T>(path, init, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    localStorage.removeItem(VISITOR_TOKEN);
    token = await visitorToken();
    return api<T>(path, init, token);
  }
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: string };
}

export async function loginAdmin(email: string, password: string) {
  const result = await api<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  adminSessionGeneration += 1;
  adminFestival = undefined;
  localStorage.setItem(ADMIN_ACCESS, result.accessToken);
  localStorage.setItem(ADMIN_REFRESH, result.refreshToken);
  return result.user;
}

function clearAdminSession() {
  adminFestival = undefined;
  localStorage.removeItem(ADMIN_ACCESS);
  localStorage.removeItem(ADMIN_REFRESH);
  localStorage.removeItem("festai-admin-festival-id"); // 예전 버전이 남긴 캐시 정리
}

export async function logoutAdmin() {
  const refreshToken = localStorage.getItem(ADMIN_REFRESH);
  adminSessionGeneration += 1;
  try {
    if (refreshToken) {
      await api<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearAdminSession();
  }
}

let adminRefresh: Promise<string> | undefined;
let adminSessionGeneration = 0;

async function refreshAdminToken() {
  if (adminRefresh) return adminRefresh;
  const generation = adminSessionGeneration;
  const refresh = (async () => {
    const refreshToken = localStorage.getItem(ADMIN_REFRESH);
    if (!refreshToken) throw new ApiError("로그인이 필요합니다.", 401);
    const result = await api<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    if (generation !== adminSessionGeneration) throw new ApiError("로그인이 필요합니다.", 401);
    localStorage.setItem(ADMIN_ACCESS, result.accessToken);
    localStorage.setItem(ADMIN_REFRESH, result.refreshToken);
    return result.accessToken;
  })().catch((error) => {
    if (generation === adminSessionGeneration) clearAdminSession();
    throw error;
  }).finally(() => {
    if (adminRefresh === refresh) adminRefresh = undefined;
  });
  adminRefresh = refresh;
  return refresh;
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  let token = localStorage.getItem(ADMIN_ACCESS);
  if (!token) token = await refreshAdminToken();
  try {
    return await api<T>(path, init, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const latestToken = localStorage.getItem(ADMIN_ACCESS);
    token = latestToken && latestToken !== token ? latestToken : await refreshAdminToken();
    return api<T>(path, init, token);
  }
}

export function currentAdmin() {
  return adminApi<{ id: string; email: string; name: string; role: string }>("/me");
}

// 축제 ID는 localStorage에 남기지 않는다 — 오래된 캐시로 다른 축제의 데이터를 바꾸는 사고를 막기 위해
// 페이지 로드마다 접근 가능한 축제 목록에서 코드가 정확히 일치하는 축제를 다시 확인한다.
let adminFestival: Promise<string> | undefined;

export function adminFestivalId() {
  adminFestival ??= (async () => {
    const festivals = await adminApi<{ id: string; code: string }[]>("/admin/festivals");
    const festival = festivals.find((item) => item.code === FESTIVAL_CODE);
    if (!festival) {
      throw new ApiError(`축제 코드 ${FESTIVAL_CODE}에 해당하는 축제에 접근할 수 없습니다. 관리자 계정 권한과 축제 코드 설정을 확인해주세요.`, 403);
    }
    return festival.id;
  })().catch((error) => {
    adminFestival = undefined;
    throw error;
  });
  return adminFestival;
}
