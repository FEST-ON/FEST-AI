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
const FESTIVAL_ID = "festai-admin-festival-id";

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

function visitorToken(): Promise<string> {
  const stored = localStorage.getItem(VISITOR_TOKEN);
  if (stored) return Promise.resolve(stored);
  visitorSession ??= api<{ sessionToken: string }>(`/public/festivals/${FESTIVAL_CODE}/visitor-sessions`, {
    method: "POST",
    body: JSON.stringify({ language: "ko", accessibilityPreferences: {}, consents: {} }),
  }).then(({ sessionToken }) => {
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
  localStorage.setItem(ADMIN_ACCESS, result.accessToken);
  localStorage.setItem(ADMIN_REFRESH, result.refreshToken);
  localStorage.removeItem(FESTIVAL_ID);
  return result.user;
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_ACCESS);
  localStorage.removeItem(ADMIN_REFRESH);
  localStorage.removeItem(FESTIVAL_ID);
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

export async function adminFestivalId() {
  const stored = localStorage.getItem(FESTIVAL_ID);
  if (stored) return stored;
  const festivals = await adminApi<{ id: string; code: string }[]>("/admin/festivals");
  const festival = festivals.find((item) => item.code === FESTIVAL_CODE) ?? festivals[0];
  if (!festival) throw new Error("관리할 축제가 없습니다.");
  localStorage.setItem(FESTIVAL_ID, festival.id);
  return festival.id;
}
