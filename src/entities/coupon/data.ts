import { delay } from "@/shared/lib/async";
import type { Locale } from "@/shared/lib/i18n";
import { translateEntries } from "@/shared/lib/i18n/translate-client";
import type { LocalCoupon, StampSpot } from "./model";

// Source-of-truth content (Korean). Non-Korean locales are produced by
// auto-translating these fields at request time instead of a hand-written dictionary.
const STAMP_SPOTS_BASE: Array<
  Pick<StampSpot, "id" | "collected"> & { name: string; location: string }
> = [
  { id: "st1", collected: true, name: "통합 안내소", location: "정문 입구" },
  { id: "st2", collected: true, name: "업사이클링 공방", location: "체험존 A-2" },
  { id: "st3", collected: false, name: "그린마켓", location: "마켓존 G-1" },
  { id: "st4", collected: false, name: "지속가능 사진전", location: "전시홀" },
  { id: "st5", collected: false, name: "물빛광장 포토존", location: "물빛광장" },
];

const LOCAL_COUPONS_BASE: Array<
  Pick<LocalCoupon, "id" | "expiresAt" | "used"> & {
    store: string;
    category: string;
    discount: string;
    location: string;
  }
> = [
  {
    id: "cp1", expiresAt: "2026-09-27", used: false,
    store: "로컬빵집 밀도", category: "베이커리", discount: "다회용기 이용 시 10% 할인", location: "여의도 본점 (축제장 도보 6분)",
  },
  {
    id: "cp2", expiresAt: "2026-09-30", used: false,
    store: "여의도 수제버거", category: "음식점", discount: "스탬프 3개 이상 2,000원 할인", location: "여의나루역 인근",
  },
  {
    id: "cp3", expiresAt: "2026-09-20", used: true,
    store: "제로웨이스트 마켓 다시봄", category: "리빙", discount: "친환경 제품 15% 할인", location: "그린마켓 G-1",
  },
];

export async function getStampSpots(locale: Locale): Promise<StampSpot[]> {
  const koFields = Object.fromEntries(
    STAMP_SPOTS_BASE.flatMap((item) => [
      [`${item.id}.name`, item.name],
      [`${item.id}.location`, item.location],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return STAMP_SPOTS_BASE.map((item) => ({
    id: item.id,
    collected: item.collected,
    name: text[`${item.id}.name`] ?? item.name,
    location: text[`${item.id}.location`] ?? item.location,
  }));
}

export async function getLocalCoupons(locale: Locale): Promise<LocalCoupon[]> {
  const koFields = Object.fromEntries(
    LOCAL_COUPONS_BASE.flatMap((item) => [
      [`${item.id}.store`, item.store],
      [`${item.id}.category`, item.category],
      [`${item.id}.discount`, item.discount],
      [`${item.id}.location`, item.location],
    ]),
  );
  const text = await translateEntries(koFields, locale);
  return LOCAL_COUPONS_BASE.map((item) => ({
    id: item.id,
    expiresAt: item.expiresAt,
    used: item.used,
    store: text[`${item.id}.store`] ?? item.store,
    category: text[`${item.id}.category`] ?? item.category,
    discount: text[`${item.id}.discount`] ?? item.discount,
    location: text[`${item.id}.location`] ?? item.location,
  }));
}

export async function fetchStampSpots(locale: Locale = "ko") {
  return delay(await getStampSpots(locale), 400);
}
export async function fetchLocalCoupons(locale: Locale = "ko") {
  return delay(await getLocalCoupons(locale), 450);
}
