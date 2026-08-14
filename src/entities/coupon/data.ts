import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";
import type { Locale } from "@/shared/lib/i18n";
import { translateFields } from "@/shared/lib/i18n/translate-client";
import type { AvailableCoupon, IssuedCoupon, PointSummary, StampSpot } from "./model";

interface RewardAction {
  id: string;
  action_type: string;
  verification_type: string;
  points: number;
  name: string;
  location: string;
  completed: boolean;
}

export async function fetchStampSpots(locale: Locale = "ko"): Promise<StampSpot[]> {
  const actions = await visitorApi<RewardAction[]>("/visitor/reward-actions");
  const spots = actions
    // QR 등 현장 인증이 필요한 리워드는 스탬프 화면에서 직접 찍을 수 없다.
    .filter((action) => action.verification_type === "SELF")
    .map<StampSpot>((action) => ({ id: action.id, name: action.name, location: action.location, collected: action.completed }));
  return translateFields(spots, ["name", "location"], locale);
}

export function collectStamp(actionId: string) {
  return visitorApi(`/visitor/reward-events`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    // ponytail: QR 스캐너가 붙으면 verificationKey는 스캔 값으로 바뀐다(서버 rule.verificationKeys로 검증).
    body: JSON.stringify({ rewardActionId: actionId, verificationKey: `stamp:${actionId}`, evidence: {} }),
  });
}

export async function fetchAvailableCoupons(locale: Locale = "ko") {
  const coupons = await publicApi<AvailableCoupon[]>(`/public/festivals/${FESTIVAL_CODE}/coupons`);
  return translateFields(coupons, ["name", "description", "business_name"], locale);
}

export async function fetchMyCoupons(locale: Locale = "ko") {
  const coupons = await visitorApi<IssuedCoupon[]>("/visitor/coupons");
  return translateFields(coupons, ["name", "description", "business_name"], locale);
}

export function issueCoupon(couponId: string) {
  return visitorApi<{ id: string; issueToken: string; couponName: string }>(`/visitor/coupons/${couponId}/issues`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

export function fetchPoints() {
  return visitorApi<PointSummary>("/visitor/points");
}
