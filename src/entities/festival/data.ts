import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import { BCP47_BY_LOCALE, dictionaries } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { translateEntries, translateFields } from "@/shared/lib/i18n/translate-client";
import type { FacilityInfo, FestivalInfo, ScheduleItem, TransportOption } from "./model";

// 랜딩 페이지(/)는 백엔드 없이도 떠야 해서 축제 소개만 정적으로 둔다.
export const festivalInfo: FestivalInfo = {
  id: "greenhan-2026",
  name: "2026 그린한강 페스티벌",
  subtitle: "AI와 ESG가 함께 만드는 지속가능한 강변축제",
  location: "서울 영등포구 여의도한강공원 물빛광장 일대",
  period: { start: "2026-09-18", end: "2026-09-20" },
  hours: "매일 11:00 - 22:00",
  organizer: "영등포구청 축제운영과",
  approvedAt: "2026-08-01",
  description:
    "다회용기·분리배출·대중교통 이용을 장려하는 친환경 축제로, 지역 소상공인과 함께 성장하는 지속가능한 지역축제를 지향합니다.",
};

// 교통 정보는 아직 백엔드 API가 없어 데모 데이터를 쓴다.
const TRANSPORT: TransportOption[] = [
  { id: "t1", mode: "지하철", status: "원활", label: "5호선 여의나루역 2번 출구", detail: "도보 5분, 엘리베이터 이용 가능" },
  { id: "t2", mode: "버스", status: "보통", label: "간선 462, 753 여의나루역 정류장", detail: "배차 8~10분" },
  { id: "t3", mode: "셔틀", status: "원활", label: "여의도역 ↔ 축제장 무료 셔틀", detail: "15분 간격 운행 · 전기버스" },
  { id: "t4", mode: "주차", status: "혼잡", label: "여의나루 임시주차장 (사전예약)", detail: "잔여 42면 / 200면" },
];

export function fetchTransport(locale: Locale = "ko") {
  return translateFields(TRANSPORT, ["label", "detail"], locale);
}

export async function fetchFestivalInfo(locale: Locale = "ko"): Promise<FestivalInfo> {
  const festival = await publicApi<{
    id: string; name: string; description: string; starts_at: string; ends_at: string; updated_at: string;
  }>(`/public/festivals/${FESTIVAL_CODE}`);
  const text = dictionaries[locale].festivalData;
  const translated = await translateEntries({ name: festival.name, description: festival.description }, locale);
  return {
    id: festival.id,
    name: translated.name ?? festival.name,
    subtitle: translated.description ?? festival.description,
    location: text.fallbackLocation,
    period: { start: festival.starts_at.slice(0, 10), end: festival.ends_at.slice(0, 10) },
    hours: text.fallbackHours,
    organizer: text.fallbackOrganizer,
    approvedAt: festival.updated_at.slice(0, 10),
    description: translated.description ?? festival.description,
  };
}

export async function fetchSchedule(locale: Locale = "ko") {
  const programs = await publicApi<Array<{
    id: string; title: string; category: string;
    sessions: Array<{ id: string; startsAt: string; area: { name: string } }>;
  }>>(`/public/festivals/${FESTIVAL_CODE}/programs?status=OPEN`);
  const categories: Record<string, ScheduleItem["category"]> = {
    performance: "공연", experience: "체험", exhibition: "전시", food: "푸드", event: "행사",
  };
  const bcp47 = BCP47_BY_LOCALE[locale];
  const items = programs.flatMap((program) => program.sessions.map((session) => {
    const startsAt = new Date(session.startsAt);
    return {
      id: session.id,
      day: startsAt.toLocaleDateString(bcp47, { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }),
      time: startsAt.toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }),
      title: program.title,
      stage: session.area.name,
      category: categories[program.category] ?? "행사",
    } satisfies ScheduleItem;
  }));
  return translateFields(items, ["title", "stage"], locale);
}

export async function fetchFacilities(locale: Locale = "ko") {
  const rows = await publicApi<Array<{
    id: string; name: string; facility_type: string; area: { name: string };
  }>>(`/public/festivals/${FESTIVAL_CODE}/facilities`);
  const types: Record<string, FacilityInfo["type"]> = {
    RESTROOM: "화장실", PARKING: "주차장", FIRST_AID: "구급실", INFO: "안내소", NURSING_ROOM: "수유실", STORAGE: "물품보관소",
  };
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: types[row.facility_type] ?? "안내소",
    location: row.area.name,
    walkMinutes: 0,
  } satisfies FacilityInfo));
  return translateFields(items, ["name", "location"], locale);
}
