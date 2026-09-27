"use client";

import { useQuery } from "@tanstack/react-query";
import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import { dictionaries, type Locale } from "@/shared/lib/i18n";

const ALL_LOCALES = Object.keys(dictionaries) as Locale[];

/** 축제별 지원 언어 설정(AI-05). 자동 전환·언어 선택 화면이 이 목록만 쓴다. */
export async function fetchFestivalLanguages(): Promise<{ supported: Locale[]; default: Locale }> {
  const festival = await publicApi<{ supportedLanguages: string[]; defaultLanguage: string }>(`/public/festivals/${FESTIVAL_CODE}`);
  const supported = festival.supportedLanguages.filter((language): language is Locale => language in dictionaries);
  const fallback = (festival.defaultLanguage in dictionaries ? festival.defaultLanguage : "ko") as Locale;
  return { supported: supported.length ? supported : [fallback], default: fallback };
}

/**
 * 축제별 지원 언어(AI-05). 조회 전·실패 시에는 화면에서 언어 선택이 사라지지 않도록
 * 번역이 준비된 전체 언어를 쓴다.
 */
export function useFestivalLanguages() {
  const { data } = useQuery({ queryKey: ["festival-languages"], queryFn: fetchFestivalLanguages, staleTime: Infinity });
  return { languages: data?.supported ?? ALL_LOCALES, defaultLanguage: data?.default ?? "ko" };
}
