import { delay } from "@/shared/lib/async";
import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import type {
  CongestionZone,
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

export const scheduleItems: ScheduleItem[] = [
  { id: "s1", day: "9/18(금)", time: "11:00", title: "그린마켓 오픈 · 다회용기 스탬프존", stage: "물빛광장 마켓존", category: "체험" },
  { id: "s2", day: "9/18(금)", time: "19:00", title: "개막 축하공연 - 로컬 인디밴드", stage: "메인스테이지", category: "공연" },
  { id: "s3", day: "9/19(토)", time: "14:00", title: "ESG 체험존: 업사이클링 공방", stage: "체험존 A", category: "체험" },
  { id: "s4", day: "9/19(토)", time: "17:30", title: "지역 푸드트럭 상생마켓", stage: "푸드존", category: "푸드" },
  { id: "s5", day: "9/19(토)", time: "20:00", title: "한강 야간 드론라이트쇼", stage: "한강 수상무대", category: "공연" },
  { id: "s6", day: "9/20(일)", time: "13:00", title: "지속가능 사진전 \"우리가 지킨 강\"", stage: "전시홀", category: "전시" },
  { id: "s7", day: "9/20(일)", time: "18:30", title: "폐막식 및 친환경 시민 시상", stage: "메인스테이지", category: "행사" },
];

export const facilities: FacilityInfo[] = [
  { id: "f1", name: "물빛광장 화장실", type: "화장실", location: "메인스테이지 옆", walkMinutes: 2 },
  { id: "f2", name: "여의나루 임시주차장", type: "주차장", location: "여의나루역 3번 출구", walkMinutes: 8 },
  { id: "f3", name: "축제 구급실", type: "구급실", location: "안내소 옆 텐트", walkMinutes: 3 },
  { id: "f4", name: "통합 안내소", type: "안내소", location: "정문 입구", walkMinutes: 1 },
  { id: "f5", name: "수유실 & 유아쉼터", type: "수유실", location: "체험존 A 뒤편", walkMinutes: 4 },
  { id: "f6", name: "무료 물품보관소", type: "물품보관소", location: "정문 입구 옆", walkMinutes: 1 },
];

export const transportOptions: TransportOption[] = [
  { id: "t1", mode: "지하철", label: "5호선 여의나루역 2번 출구", detail: "도보 5분, 엘리베이터 이용 가능", status: "원활" },
  { id: "t2", mode: "버스", label: "간선 462, 753 여의나루역 정류장", detail: "배차 8~10분", status: "보통" },
  { id: "t3", mode: "셔틀", label: "여의도역 ↔ 축제장 무료 셔틀", detail: "15분 간격 운행 · 전기버스", status: "원활" },
  { id: "t4", mode: "주차", label: "여의나루 임시주차장 (사전예약)", detail: "잔여 42면 / 200면", status: "혼잡" },
];

export const congestionZones: CongestionZone[] = [
  { id: "c1", zone: "메인스테이지", level: "혼잡", waitMinutes: 18, updatedAt: "방금 전" },
  { id: "c2", zone: "그린마켓 · 푸드존", level: "보통", waitMinutes: 8, updatedAt: "2분 전" },
  { id: "c3", zone: "체험존 A (업사이클링)", level: "여유", waitMinutes: 2, updatedAt: "1분 전" },
  { id: "c4", zone: "전시홀", level: "여유", waitMinutes: 0, updatedAt: "방금 전" },
];

export async function fetchFestivalInfo() {
  const festival = await publicApi<{
    id: string; name: string; description: string; starts_at: string; ends_at: string; updated_at: string;
  }>(`/public/festivals/${FESTIVAL_CODE}`);
  return {
    id: festival.id,
    name: festival.name,
    subtitle: festival.description,
    location: "공식 축제 행사장",
    period: { start: festival.starts_at.slice(0, 10), end: festival.ends_at.slice(0, 10) },
    hours: "프로그램별 운영시간 확인",
    organizer: "축제 운영사무국",
    approvedAt: festival.updated_at.slice(0, 10),
    description: festival.description,
  } satisfies FestivalInfo;
}
export async function fetchSchedule() {
  const programs = await publicApi<Array<{
    id: string; title: string; category: string;
    sessions: Array<{ id: string; startsAt: string; area: { name: string } }>;
  }>>(`/public/festivals/${FESTIVAL_CODE}/programs?status=OPEN`);
  const categories: Record<string, ScheduleItem["category"]> = {
    performance: "공연", experience: "체험", exhibition: "전시", food: "푸드", event: "행사",
  };
  return programs.flatMap((program) => program.sessions.map((session) => {
    const startsAt = new Date(session.startsAt);
    return {
      id: session.id,
      day: startsAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" }),
      time: startsAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }),
      title: program.title,
      stage: session.area.name,
      category: categories[program.category] ?? "행사",
    } satisfies ScheduleItem;
  }));
}
export async function fetchFacilities() {
  const rows = await publicApi<Array<{
    id: string; name: string; facility_type: string; area: { name: string };
  }>>(`/public/festivals/${FESTIVAL_CODE}/facilities`);
  const types: Record<string, FacilityInfo["type"]> = {
    RESTROOM: "화장실", PARKING: "주차장", FIRST_AID: "구급실", INFO: "안내소", NURSING_ROOM: "수유실", STORAGE: "물품보관소",
  };
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: types[row.facility_type] ?? "안내소",
    location: row.area.name,
    walkMinutes: 0,
  }));
}
export async function fetchTransport() {
  return delay(transportOptions, 450);
}
export async function fetchCongestion() {
  return delay(congestionZones, 350);
}
