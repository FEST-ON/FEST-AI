export interface StampSpot {
  id: string;
  name: string;
  location: string;
  collected: boolean;
}

export type CouponBenefitType = "FIXED" | "PERCENT" | "GIFT";

/** 방문객이 발행받을 수 있는 지역상권 쿠폰(발행 전). */
export interface CouponOffer {
  id: string;
  couponName: string;
  businessName: string;
  description: string;
  benefitType: CouponBenefitType;
  benefitValue: number;
  validUntil: string;
  /** 남은 발행 수량. 0이면 소진. */
  remaining: number;
}

export type IssuedCouponStatus = "ISSUED" | "REDEEMED" | "EXPIRED";

/** 방문객에게 발행된 쿠폰 1장. 업체가 QR을 읽어 사용 처리한다. */
export interface IssuedCoupon {
  id: string;
  couponName: string;
  businessName: string;
  benefitType: CouponBenefitType;
  benefitValue: number;
  status: IssuedCouponStatus;
  issuedAt: string;
  expiresAt: string;
  /**
   * 발행 응답에서 한 번만 내려오는 사용 토큰(서버에는 해시만 저장된다).
   * 목록 재조회로는 다시 받을 수 없어 이 기기에 보관한 값을 붙여준다.
   */
  issueToken?: string;
}

export function isCouponUsable(coupon: IssuedCoupon, now = Date.now()) {
  if (coupon.status !== "ISSUED") return false;
  const expiresAt = new Date(coupon.expiresAt).getTime();
  return !Number.isFinite(expiresAt) || expiresAt > now;
}

export interface PointLedgerEntry {
  id: string;
  points_delta: number;
  reason: string;
  created_at: string;
}

export interface PointSummary {
  balance: number;
  ledger: PointLedgerEntry[];
}
