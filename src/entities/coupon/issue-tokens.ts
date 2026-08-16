"use client";

// 쿠폰 사용 토큰(issueToken)은 발행 응답에서 딱 한 번만 내려온다 — 서버에는 해시만 남아
// 목록을 다시 불러도 되받을 수 없다. QR로 보여주려면 발행한 기기에 보관하는 수밖에 없다.
const STORAGE_KEY = "festai-coupon-tokens";

type TokenMap = Record<string, string>;

function read(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenMap) : {};
  } catch {
    // 저장 값이 깨졌으면 없는 것으로 본다 — 토큰이 없으면 화면이 재발행을 안내한다.
    return {};
  }
}

export function issueTokenOf(issueId: string) {
  return read()[issueId];
}

export function rememberIssueToken(issueId: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [issueId]: token }));
  } catch {
    // 저장 공간이 없어도 발행 자체는 끝났으므로 막지 않는다.
  }
}
