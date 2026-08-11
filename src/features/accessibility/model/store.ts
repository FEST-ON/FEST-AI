"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccessibilityLanguage } from "@/entities/visitor";

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

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      language: "한국어",
      largeText: false,
      voiceGuide: false,
      visitorMode: "qr",
      setLanguage: (language) => set({ language }),
      setVisitorMode: (visitorMode) => set({ visitorMode }),
      toggleLargeText: () => set((state) => ({ largeText: !state.largeText })),
      toggleVoiceGuide: () => set((state) => ({ voiceGuide: !state.voiceGuide })),
    }),
    { name: "festai-accessibility" },
  ),
);
