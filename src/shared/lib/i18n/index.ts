"use client";

import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { ko } from "./dictionaries/ko";
import { en } from "./dictionaries/en";
import { zh } from "./dictionaries/zh";
import { ja } from "./dictionaries/ja";
import { BCP47_BY_LOCALE, LOCALE_BY_LANGUAGE } from "./locale";
import type { Locale } from "./locale";

export type { Locale } from "./locale";
export { LOCALE_BY_LANGUAGE, LANGUAGE_BY_LOCALE, BCP47_BY_LOCALE } from "./locale";
export { detectLocale } from "./detect-locale";
export { useAutoTranslate } from "./use-auto-translate";

export type Dictionary = typeof ko;

export const dictionaries: Record<Locale, Dictionary> = { ko, en, zh, ja };

export function useTranslation() {
  const language = useAccessibilityStore((state) => state.language);
  const locale = LOCALE_BY_LANGUAGE[language];
  return { t: dictionaries[locale], locale, bcp47: BCP47_BY_LOCALE[locale] };
}
