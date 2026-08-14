"use client";

import { useEffect, useRef } from "react";

/**
 * 음성 안내가 켜져 있으면 새 안내 문장을 소리 내 읽는다.
 * ponytail: 브라우저 내장 SpeechSynthesis만 쓴다 — 외부 TTS는 키·비용·지연이 붙는다.
 */
export function useSpeechOutput(text: string | undefined, { enabled, bcp47 }: { enabled: boolean; bcp47: string }) {
  const spokenRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!enabled) {
      window.speechSynthesis.cancel();
      spokenRef.current = undefined;
      return;
    }
    if (!text || spokenRef.current === text) return;

    spokenRef.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [text, enabled, bcp47]);

  // 화면을 떠나면 읽던 문장을 끊는다 — 뒤로 가기 후에도 계속 말하면 사용자가 멈출 방법이 없다.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
}
