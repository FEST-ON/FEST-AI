import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";
import type { Locale } from "@/shared/lib/i18n";
import { translateFields } from "@/shared/lib/i18n/translate-client";
import { issueTokenOf, rememberIssueToken } from "./issue-tokens";
import type { PointSummary, CouponBenefitType, CouponOffer, IssuedCoupon, IssuedCouponStatus, StampSpot } from "./model";

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

interface CouponOfferRow {
  id: string;
  name: string;
  description: string | null;
  benefit_type: CouponBenefitType;
  benefit_value: number;
  valid_from: string;
  valid_until: string;
  remaining: number;
  business_name: string;
}

export async function fetchCouponOffers(locale: Locale = "ko"): Promise<CouponOffer[]> {
  const rows = await publicApi<CouponOfferRow[]>(`/public/festivals/${FESTIVAL_CODE}/coupons`);
  const offers = rows.map<CouponOffer>((row) => ({
    id: row.id,
    couponName: row.name,
    businessName: row.business_name,
    description: row.description ?? "",
    benefitType: row.benefit_type,
    benefitValue: Number(row.benefit_value),
    validUntil: row.valid_until,
    remaining: row.remaining,
  }));
  return translateFields(offers, ["couponName", "businessName", "description"], locale);
}

// 목록(GET /visitor/coupons)은 DB 컬럼 그대로 snake_case로 내려오고,
// 발행 응답(POST .../issues)만 손으로 만든 camelCase 필드를 함께 담아준다.
interface IssuedCouponRow {
  id: string;
  status: IssuedCouponStatus;
  issued_at: string;
  expires_at: string;
  name?: string;
  business_name?: string;
  benefit_type?: CouponBenefitType;
  benefit_value?: number;
  couponName?: string;
  businessName?: string;
  issueToken?: string;
}

function normalizeIssued(row: IssuedCouponRow): IssuedCoupon {
  return {
    id: row.id,
    couponName: row.name ?? row.couponName ?? "",
    businessName: row.business_name ?? row.businessName ?? "",
    benefitType: row.benefit_type ?? "GIFT",
    benefitValue: Number(row.benefit_value ?? 0),
    status: row.status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    issueToken: row.issueToken ?? issueTokenOf(row.id),
  };
}

export async function fetchMyCoupons(locale: Locale = "ko"): Promise<IssuedCoupon[]> {
  const rows = await visitorApi<IssuedCouponRow[]>("/visitor/coupons");
  return translateFields(rows.map(normalizeIssued), ["couponName", "businessName"], locale);
}

export async function issueCoupon(couponId: string) {
  const row = await visitorApi<IssuedCouponRow>(`/visitor/coupons/${couponId}/issues`, {
    method: "POST",
    // 버튼 연타로 같은 쿠폰이 여러 장 발행되지 않도록 다른 방문객 API와 같은 방식으로 막는다.
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  // 사용 토큰은 이 응답에서만 받을 수 있으므로 곧바로 기기에 저장한다.
  if (row.issueToken) rememberIssueToken(row.id, row.issueToken);
  return normalizeIssued(row);
}

export function fetchPoints() {
  return visitorApi<PointSummary>("/visitor/points");
}
