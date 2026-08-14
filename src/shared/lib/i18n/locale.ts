import type { AccessibilityLanguage } from "@/entities/visitor";

export type Locale = "ko" | "en" | "zh" | "ja";

export const LOCALE_BY_LANGUAGE: Record<AccessibilityLanguage, Locale> = {
  한국어: "ko",
  English: "en",
  中文: "zh",
  日本語: "ja",
};

export const BCP47_BY_LOCALE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
};
