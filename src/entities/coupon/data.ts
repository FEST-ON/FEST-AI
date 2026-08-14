import type { Locale } from "@/shared/lib/i18n";
import { translateFields } from "@/shared/lib/i18n/translate-client";
import type { LocalCoupon, StampSpot } from "./model";

// Source-of-truth content (Korean). 백엔드에 아직 API가 없어 데모 데이터를 쓰고,
// 한국어 외 언어는 요청 시점에 자동 번역한다.
const STAMP_SPOTS: StampSpot[] = [
  { id: "st1", collected: true, name: "통합 안내소", location: "정문 입구" },
  { id: "st2", collected: true, name: "업사이클링 공방", location: "체험존 A-2" },
  { id: "st3", collected: false, name: "그린마켓", location: "마켓존 G-1" },
  { id: "st4", collected: false, name: "지속가능 사진전", location: "전시홀" },
  { id: "st5", collected: false, name: "물빛광장 포토존", location: "물빛광장" },
];

const LOCAL_COUPONS: LocalCoupon[] = [
  { id: "cp1", expiresAt: "2026-09-27", used: false, store: "로컬빵집 밀도", category: "베이커리", discount: "다회용기 이용 시 10% 할인", location: "여의도 본점 (축제장 도보 6분)" },
  { id: "cp2", expiresAt: "2026-09-30", used: false, store: "여의도 수제버거", category: "음식점", discount: "스탬프 3개 이상 2,000원 할인", location: "여의나루역 인근" },
  { id: "cp3", expiresAt: "2026-09-20", used: true, store: "제로웨이스트 마켓 다시봄", category: "리빙", discount: "친환경 제품 15% 할인", location: "그린마켓 G-1" },
];

export function fetchStampSpots(locale: Locale = "ko") {
  return translateFields(STAMP_SPOTS, ["name", "location"], locale);
}

export function fetchLocalCoupons(locale: Locale = "ko") {
  return translateFields(LOCAL_COUPONS, ["store", "category", "discount", "location"], locale);
}
