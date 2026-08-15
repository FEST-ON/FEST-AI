"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFestivalLanguages } from "@/entities/festival";
import { dictionaries } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

const ALL_LOCALES = Object.keys(dictionaries) as Locale[];

/**
 * 축제별 지원 언어(AI-05). 조회 전·실패 시에는 화면에서 언어 선택이 사라지지 않도록
 * 번역이 준비된 전체 언어를 쓴다.
 */
export function useFestivalLanguages() {
  const { data } = useQuery({ queryKey: ["festival-languages"], queryFn: fetchFestivalLanguages, staleTime: Infinity });
  return { languages: data?.supported ?? ALL_LOCALES, defaultLanguage: data?.default ?? "ko" };
}
