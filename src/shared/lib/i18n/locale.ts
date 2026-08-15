import type { AccessibilityLanguage } from "@/entities/visitor";

export type Locale = "ko" | "en" | "zh" | "ja";

export const LOCALE_BY_LANGUAGE: Record<AccessibilityLanguage, Locale> = {
  한국어: "ko",
  English: "en",
  中文: "zh",
  日本語: "ja",
};

export const LANGUAGE_BY_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_BY_LANGUAGE).map(([language, locale]) => [locale, language as AccessibilityLanguage]),
) as Record<Locale, AccessibilityLanguage>;

export const BCP47_BY_LOCALE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
};
