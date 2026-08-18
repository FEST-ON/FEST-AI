"use client";

import { useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "synthesizing" | "playing" | "fallback";

interface VoiceResponse {
  data?: {
    audioBase64?: string;
    mimeType?: string;
    provider?: string;
  };
}

const VOICE_ENDPOINT = "/api/backend/voice/synthesize";

function stopAudio(audioRef: { current: HTMLAudioElement | null }, urlRef: { current: string | null }) {
  audioRef.current?.pause();
  audioRef.current = null;
  if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  urlRef.current = null;
}

/**
 * 음성 안내가 켜져 있으면 새 안내 문장을 소리 내 읽는다.
 * CosyVoice 3 FastAPI가 연결되어 있으면 서버 음성을 우선 사용하고,
 * 모델 서버가 아직 준비되지 않은 로컬 환경에서는 브라우저 음성으로 대체한다.
 */
export function useSpeechOutput(text: string | undefined, { enabled, bcp47 }: { enabled: boolean; bcp47: string }) {
  const spokenRef = useRef<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      window.speechSynthesis?.cancel();
      stopAudio(audioRef, audioUrlRef);
      spokenRef.current = undefined;
      setStatus("idle");
      return;
    }
    if (!text || spokenRef.current === text) return;

    const spokenText = text;
    spokenRef.current = spokenText;
    const controller = new AbortController();
    let cancelled = false;

    function browserFallback(value: string) {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      stopAudio(audioRef, audioUrlRef);
      setStatus("fallback");
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = bcp47;
      utterance.onend = () => setStatus("idle");
      utterance.onerror = () => setStatus("idle");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }

    async function synthesize() {
      setStatus("synthesizing");
      try {
        const response = await fetch(VOICE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: bcp47, provider: "cosyvoice3" }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`voice-api-${response.status}`);
        const payload = (await response.json()) as VoiceResponse;
        const audioBase64 = payload.data?.audioBase64;
        if (!audioBase64 || cancelled) throw new Error("voice-audio-missing");

        const mimeType = payload.data?.mimeType ?? "audio/wav";
        const binary = Uint8Array.from(atob(audioBase64), (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([binary], { type: mimeType }));
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          stopAudio(audioRef, audioUrlRef);
          setStatus("idle");
        };
        audio.onerror = () => {
          stopAudio(audioRef, audioUrlRef);
          browserFallback(spokenText);
        };
        setStatus("playing");
        await audio.play();
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        browserFallback(spokenText);
      }
    }

    void synthesize();
    return () => {
      cancelled = true;
      controller.abort();
      stopAudio(audioRef, audioUrlRef);
    };
  }, [text, enabled, bcp47]);

  // 화면을 떠나면 읽던 문장을 끊는다 — 뒤로 가기 후에도 계속 말하면 사용자가 멈출 방법이 없다.
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    stopAudio(audioRef, audioUrlRef);
  }, []);

  return { status };
}
