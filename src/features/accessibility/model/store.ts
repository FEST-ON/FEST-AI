"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccessibilityLanguage } from "@/entities/visitor";
import { json, visitorApi } from "@/shared/lib/api";
import { LOCALE_BY_LANGUAGE } from "@/shared/lib/i18n/locale";

export type VisitorAccessMode = "qr" | "kiosk";

interface AccessibilityState {
  language: AccessibilityLanguage;
  largeText: boolean;
  voiceGuide: boolean;
  visitorMode: VisitorAccessMode;
  setLanguage: (language: AccessibilityLanguage) => void;
  setVisitorMode: (visitorMode: VisitorAccessMode) => void;
  toggleLargeText: () => void;
  toggleVoiceGuide: () => void;
}

// 서버 세션에도 반영해야 AI 응답·안내 언어가 방문객이 고른 설정을 따른다.
// ponytail: 저장된 설정은 값을 바꿀 때만 올린다. 재방문으로 새 세션이 발급되면 서버는 축제 기본 언어로 시작한다.
function syncVisitorSession(state: AccessibilityState) {
  visitorApi("/visitor-sessions/current", json("PATCH", { language: LOCALE_BY_LANGUAGE[state.language], accessibilityPreferences: { largeText: state.largeText, voiceGuide: state.voiceGuide } })).catch(() => {
    // 화면 설정은 로컬에 이미 반영됐으므로 동기화 실패로 사용자를 막지 않는다.
  });
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      language: "한국어",
      largeText: false,
      voiceGuide: false,
      visitorMode: "qr",
      setLanguage: (language) => {
        set({ language });
        syncVisitorSession(get());
      },
      // 키오스크/QR은 기기 표시 방식이라 서버 세션과 무관하다.
      setVisitorMode: (visitorMode) => set({ visitorMode }),
      toggleLargeText: () => {
        set((state) => ({ largeText: !state.largeText }));
        syncVisitorSession(get());
      },
      toggleVoiceGuide: () => {
        set((state) => ({ voiceGuide: !state.voiceGuide }));
        syncVisitorSession(get());
      },
    }),
    { name: "festai-accessibility" },
  ),
);
