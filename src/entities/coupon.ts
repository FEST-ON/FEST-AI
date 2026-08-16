"use client";

import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";
import type { Locale } from "@/shared/lib/i18n";
import { translateFields } from "@/shared/lib/i18n/translate-client";

export interface StampSpot {
  id: string;
  name: string;
  location: string;
  collected: boolean;
  /** SELF는 화면에서 바로 찍고, 그 외(QR·현장 확인)는 현장 인증 값이 있어야 한다. */
  verificationType: string;
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
  pointsDelta: number;
  reason: string;
  createdAt: string;
}

export interface PointSummary {
  balance: number;
  ledger: PointLedgerEntry[];
}

// 쿠폰 사용 토큰(issueToken)은 발행 응답에서 딱 한 번만 내려온다 — 서버에는 해시만 남아
// 목록을 다시 불러도 되받을 수 없다. QR로 보여주려면 발행한 기기에 보관하는 수밖에 없다.
const STORAGE_KEY = "festai-coupon-tokens";

type TokenMap = Record<string, string>;

function read(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenMap) : {};
  } catch {
    // 저장 값이 깨졌으면 없는 것으로 본다 — 토큰이 없으면 화면이 재발행을 안내한다.
    return {};
  }
}

export function issueTokenOf(issueId: string) {
  return read()[issueId];
}

export function rememberIssueToken(issueId: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [issueId]: token }));
  } catch {
    // 저장 공간이 없어도 발행 자체는 끝났으므로 막지 않는다.
  }
}

interface RewardAction {
  id: string;
  actionType: string;
  verificationType: string;
  points: number;
  name: string;
  location: string;
  completed: boolean;
}

/**
 * 스탬프 스팟 목록.
 *
 * 예전에는 SELF(자가 인증)만 남기고 걸러서, QR 인증으로 등록한 스팟은 방문객 화면에
 * 아예 나타나지 않았다(시드의 스팟이 전부 그랬다). 이제 전부 보여주고 인증 방식만 구분한다.
 */
export async function fetchStampSpots(locale: Locale = "ko"): Promise<StampSpot[]> {
  const actions = await visitorApi<RewardAction[]>("/visitor/reward-actions");
  const spots = actions.map<StampSpot>((action) => ({
    id: action.id,
    name: action.name,
    location: action.location,
    collected: action.completed,
    verificationType: action.verificationType,
  }));
  return translateFields(spots, ["name", "location"], locale);
}

/**
 * 스탬프 적립. verificationKey는 현장 QR에 담긴 값이고, 서버가 rule.verificationKeys와
 * 대조한다 — 값이 틀리면 400이라 현장에 가지 않고는 적립되지 않는다.
 */
export function collectStamp({ actionId, verificationKey }: { actionId: string; verificationKey: string }) {
  return visitorApi(`/visitor/reward-events`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ rewardActionId: actionId, verificationKey, evidence: {} }),
  });
}

interface CouponOfferRow {
  id: string;
  name: string;
  description: string | null;
  benefitType: CouponBenefitType;
  benefitValue: number;
  validFrom: string;
  validUntil: string;
  remaining: number;
  businessName: string;
}

export async function fetchCouponOffers(locale: Locale = "ko"): Promise<CouponOffer[]> {
  const rows = await publicApi<CouponOfferRow[]>(`/public/festivals/${FESTIVAL_CODE}/coupons`);
  const offers = rows.map<CouponOffer>((row) => ({
    id: row.id,
    couponName: row.name,
    businessName: row.businessName,
    description: row.description ?? "",
    benefitType: row.benefitType,
    benefitValue: Number(row.benefitValue),
    validUntil: row.validUntil,
    remaining: row.remaining,
  }));
  return translateFields(offers, ["couponName", "businessName", "description"], locale);
}

// 목록(GET /visitor/coupons)은 쿠폰 이름을 컬럼 이름 그대로 name으로,
// 발행 응답(POST .../issues)은 couponName으로 담아준다. 나머지 필드는 두 응답이 같다.
interface IssuedCouponRow {
  id: string;
  status: IssuedCouponStatus;
  issuedAt: string;
  expiresAt: string;
  name?: string;
  couponName?: string;
  businessName?: string;
  benefitType?: CouponBenefitType;
  benefitValue?: number;
  issueToken?: string;
}

function normalizeIssued(row: IssuedCouponRow): IssuedCoupon {
  return {
    id: row.id,
    couponName: row.name ?? row.couponName ?? "",
    businessName: row.businessName ?? "",
    benefitType: row.benefitType ?? "GIFT",
    benefitValue: Number(row.benefitValue ?? 0),
    status: row.status,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
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

/**
 * 사용 토큰 재발급.
 *
 * 토큰은 발급 응답에서 한 번만 내려오고 서버에는 해시만 남는다. 기기를 바꾸거나 저장소를
 * 지우면 QR을 다시 만들 수 없어 쿠폰이 죽어 있었다. 재발급하면 예전 토큰은 즉시 무효가 된다.
 */
export async function reissueCouponToken(issueId: string) {
  const row = await visitorApi<IssuedCouponRow>(`/visitor/coupon-issues/${issueId}/token`, { method: "POST" });
  if (row.issueToken) rememberIssueToken(row.id, row.issueToken);
  return normalizeIssued(row);
}

export function fetchPoints() {
  return visitorApi<PointSummary>("/visitor/points");
}
