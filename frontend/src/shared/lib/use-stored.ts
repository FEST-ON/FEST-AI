"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseJson } from "@/shared/lib/local-store";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * localStorage 값을 구독한다. 다른 탭과 같은 탭(writeJson) 변경을 모두 반영한다.
 *
 * 서버 렌더에서는 fallback을 쓰고 하이드레이션 뒤에 실제 값으로 바뀐다 — 저장소를 읽는
 * 화면이 서버·클라이언트에서 다르게 그려지는 문제를 React가 직접 처리해 준다.
 */
export function useStored<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );
  return useMemo(() => parseJson(raw, fallback), [raw, fallback]);
}
