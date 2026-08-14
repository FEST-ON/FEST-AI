import { delay } from "@/shared/lib/async";
import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import { BCP47_BY_LOCALE, dictionaries } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { translateEntries } from "@/shared/lib/i18n/translate-client";
import type {
  FacilityInfo,
  FestivalInfo,
  ScheduleItem,
  TransportOption,
} from "./model";

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

// Source-of-truth content (Korean, as it would come from the real admin-authored
// backend). Non-Korean locales are produced by auto-translating these fields at
// request time — see translateEntries() below — instead of a hand-written dictionary.
const SCHEDULE_BASE: Array<
  Pick<ScheduleItem, "id" | "time" | "category"> & { date: string; title: string; stage: string }
> = [
  { id: "s1", date: "2026-09-18", time: "11:00", category: "체험", title: "그린마켓 오픈 · 다회용기 스탬프존", stage: "물빛광장 마켓존" },
  { id: "s2", date: "2026-09-18", time: "19:00", category: "공연", title: "개막 축하공연 - 로컬 인디밴드", stage: "메인스테이지" },
  { id: "s3", date: "2026-09-19", time: "14:00", category: "체험", title: "ESG 체험존: 업사이클링 공방", stage: "체험존 A" },
  { id: "s4", date: "2026-09-19", time: "17:30", category: "푸드", title: "지역 푸드트럭 상생마켓", stage: "푸드존" },
  { id: "s5", date: "2026-09-19", time: "20:00", category: "공연", title: "한강 야간 드론라이트쇼", stage: "한강 수상무대" },
  { id: "s6", date: "2026-09-20", time: "13:00", category: "전시", title: "지속가능 사진전 \"우리가 지킨 강\"", stage: "전시홀" },
  { id: "s7", date: "2026-09-20", time: "18:30", category: "행사", title: "폐막식 및 친환경 시민 시상", stage: "메인스테이지" },
];

const FACILITIES_BASE: Array<
  Pick<FacilityInfo, "id" | "type" | "walkMinutes"> & { name: string; location: string }
> = [
  { id: "f1", type: "화장실", walkMinutes: 2, name: "물빛광장 화장실", location: "메인스테이지 옆" },
  { id: "f2", type: "주차장", walkMinutes: 8, name: "여의나루 임시주차장", location: "여의나루역 3번 출구" },
  { id: "f3", type: "구급실", walkMinutes: 3, name: "축제 구급실", location: "안내소 옆 텐트" },
  { id: "f4", type: "안내소", walkMinutes: 1, name: "통합 안내소", location: "정문 입구" },
  { id: "f5", type: "수유실", walkMinutes: 4, name: "수유실 & 유아쉼터", location: "체험존 A 뒤편" },
  { id: "f6", type: "물품보관소", walkMinutes: 1, name: "무료 물품보관소", location: "정문 입구 옆" },
];

const TRANSPORT_BASE: Array<
  Pick<TransportOption, "id" | "mode" | "status"> & { label: string; detail: string }
> = [
  { id: "t1", mode: "지하철", status: "원활", label: "5호선 여의나루역 2번 출구", detail: "도보 5분, 엘리베이터 이용 가능" },
  { id: "t2", mode: "버스", status: "보통", label: "간선 462, 753 여의나루역 정류장", detail: "배차 8~10분" },
  { id: "t3", mode: "셔틀", status: "원활", label: "여의도역 ↔ 축제장 무료 셔틀", detail: "15분 간격 운행 · 전기버스" },
  { id: "t4", mode: "주차", status: "혼잡", label: "여의나루 임시주차장 (사전예약)", detail: "잔여 42면 / 200면" },
];

export async function getScheduleItems(locale: Locale): Promise<ScheduleItem[]> {
  const bcp47 = BCP47_BY_LOCALE[locale];
  const koFields = Object.fromEntries(
    SCHEDULE_BASE.flatMap((item) => [
      [`${item.id}.title`, item.title],
      [`${item.id}.stage`, item.stage],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return SCHEDULE_BASE.map((item) => ({
    id: item.id,
    time: item.time,
    category: item.category,
    day: new Date(item.date).toLocaleDateString(bcp47, { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }),
    title: text[`${item.id}.title`] ?? item.title,
    stage: text[`${item.id}.stage`] ?? item.stage,
  }));
}

export async function getFacilities(locale: Locale): Promise<FacilityInfo[]> {
  const koFields = Object.fromEntries(
    FACILITIES_BASE.flatMap((item) => [
      [`${item.id}.name`, item.name],
      [`${item.id}.location`, item.location],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return FACILITIES_BASE.map((item) => ({
    id: item.id,
    type: item.type,
    walkMinutes: item.walkMinutes,
    name: text[`${item.id}.name`] ?? item.name,
    location: text[`${item.id}.location`] ?? item.location,
  }));
}

export async function getTransportOptions(locale: Locale): Promise<TransportOption[]> {
  const koFields = Object.fromEntries(
    TRANSPORT_BASE.flatMap((item) => [
      [`${item.id}.label`, item.label],
      [`${item.id}.detail`, item.detail],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return TRANSPORT_BASE.map((item) => ({
    id: item.id,
    mode: item.mode,
    status: item.status,
    label: text[`${item.id}.label`] ?? item.label,
    detail: text[`${item.id}.detail`] ?? item.detail,
  }));
}

export async function fetchFestivalInfo(locale: Locale = "ko") {
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
  } satisfies FestivalInfo;
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
  const sessions = programs.flatMap((program) => program.sessions.map((session) => ({ program, session })));
  const koFields = Object.fromEntries(
    sessions.flatMap(({ program, session }) => [
      [`${session.id}.title`, program.title],
      [`${session.id}.stage`, session.area.name],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return sessions.map(({ program, session }) => {
    const startsAt = new Date(session.startsAt);
    return {
      id: session.id,
      day: startsAt.toLocaleDateString(bcp47, { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }),
      time: startsAt.toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }),
      title: text[`${session.id}.title`] ?? program.title,
      stage: text[`${session.id}.stage`] ?? session.area.name,
      category: categories[program.category] ?? "행사",
    } satisfies ScheduleItem;
  });
}
export async function fetchFacilities(locale: Locale = "ko") {
  const rows = await publicApi<Array<{
    id: string; name: string; facility_type: string; area: { name: string };
  }>>(`/public/festivals/${FESTIVAL_CODE}/facilities`);
  const types: Record<string, FacilityInfo["type"]> = {
    RESTROOM: "화장실", PARKING: "주차장", FIRST_AID: "구급실", INFO: "안내소", NURSING_ROOM: "수유실", STORAGE: "물품보관소",
  };
  const koFields = Object.fromEntries(
    rows.flatMap((row) => [
      [`${row.id}.name`, row.name],
      [`${row.id}.location`, row.area.name],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return rows.map((row) => ({
    id: row.id,
    name: text[`${row.id}.name`] ?? row.name,
    type: types[row.facility_type] ?? "안내소",
    location: text[`${row.id}.location`] ?? row.area.name,
    walkMinutes: 0,
  }));
}
export async function fetchTransport(locale: Locale = "ko") {
  return delay(await getTransportOptions(locale), 450);
}
