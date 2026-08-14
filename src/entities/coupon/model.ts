export interface StampSpot {
  id: string;
  name: string;
  location: string;
  collected: boolean;
}

export type BenefitType = "FIXED" | "PERCENT" | "GIFT";

/** 발급 가능한 축제 쿠폰(공개 목록). */
export interface AvailableCoupon {
  id: string;
  name: string;
  description: string | null;
  benefit_type: BenefitType;
  benefit_value: number;
  valid_from: string;
  valid_until: string;
  remaining: number;
  business_name: string;
}

/** 방문객이 발급받은 쿠폰. */
export interface IssuedCoupon {
  id: string;
  status: "ISSUED" | "REDEEMED" | "EXPIRED" | "CANCELLED";
  issued_at: string;
  expires_at: string;
  name: string;
  description: string | null;
  benefit_type: BenefitType;
  benefit_value: number;
  business_name: string;
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

export function benefitLabel(type: BenefitType, value: number) {
  if (type === "PERCENT") return `${value}% 할인`;
  if (type === "FIXED") return `${value.toLocaleString()}원 할인`;
  return "사은품 증정";
}
