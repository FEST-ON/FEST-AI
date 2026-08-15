"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccessibilityLanguage } from "@/entities/visitor";
import { json, visitorApi } from "@/shared/lib/api";
import { LOCALE_BY_LANGUAGE } from "@/shared/lib/i18n/locale";

export type VisitorAccessMode = "qr" | "kiosk";
/** 축제 기본값 그대로인지, 방문객이 직접 골랐는지, 첫 발화로 자동 전환됐는지(AI-05 언어별 이용 로그). */
export type LanguageSource = "DEFAULT" | "MANUAL" | "AUTO";

interface AccessibilityState {
  language: AccessibilityLanguage;
  languageSource: LanguageSource;
  largeText: boolean;
  highContrast: boolean;
  voiceGuide: boolean;
  visitorMode: VisitorAccessMode;
  setLanguage: (language: AccessibilityLanguage, source?: LanguageSource) => void;
  setVisitorMode: (visitorMode: VisitorAccessMode) => void;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
  toggleVoiceGuide: () => void;
}

// 서버 세션에도 반영해야 AI 응답·안내 언어가 방문객이 고른 설정을 따른다.
// 이용 방식(키오스크/QR)과 언어 전환 방식도 함께 올린다 — 운영 대시보드의 언어별 이용 로그가 이 값으로 집계된다.
// ponytail: 저장된 설정은 값을 바꿀 때만 올린다. 재방문으로 새 세션이 발급되면 서버는 축제 기본 언어로 시작한다.
function syncVisitorSession(state: AccessibilityState) {
  visitorApi("/visitor-sessions/current", json("PATCH", {
    language: LOCALE_BY_LANGUAGE[state.language],
    accessibilityPreferences: {
      largeText: state.largeText,
      highContrast: state.highContrast,
      voiceGuide: state.voiceGuide,
      visitorMode: state.visitorMode,
      languageSource: state.languageSource,
    },
  })).catch(() => {
    // 화면 설정은 로컬에 이미 반영됐으므로 동기화 실패로 사용자를 막지 않는다.
  });
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      language: "한국어",
      languageSource: "DEFAULT",
      largeText: false,
      highContrast: false,
      voiceGuide: false,
      visitorMode: "qr",
      setLanguage: (language, source = "MANUAL") => {
        set({ language, languageSource: source });
        syncVisitorSession(get());
      },
      setVisitorMode: (visitorMode) => {
        set({ visitorMode });
        syncVisitorSession(get());
      },
      toggleLargeText: () => {
        set((state) => ({ largeText: !state.largeText }));
        syncVisitorSession(get());
      },
      toggleHighContrast: () => {
        set((state) => ({ highContrast: !state.highContrast }));
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
