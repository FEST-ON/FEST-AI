import { festivalApi, json } from "@/shared/lib/api";
import { uniqueById } from "@/shared/lib/utils";
import type { Tone } from "@/shared/ui/status-pill";

export type ParticipationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export const PARTICIPATION_LABEL: Record<string, string> = {
  DRAFT: "작성 중",
  SUBMITTED: "검토 대기",
  APPROVED: "승인",
  REJECTED: "반려",
};

/** 운영자 화면과 상인 화면이 같은 심사 상태를 같은 색으로 보여주도록 한 곳에 둔다. */
export const PARTICIPATION_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export interface AdminBusiness {
  id: string;
  businessId: string;
  name: string;
  registrationNo: string;
  category: string;
  description: string | null;
  participationStatus: ParticipationStatus;
  reviewComment: string | null;
  isSponsored: boolean;
  esgParticipating: boolean;
  boothNo: string | null;
  areaId: string | null;
  version: number;
}

export async function fetchAdminBusinesses(status?: ParticipationStatus) {
  const rows = await festivalApi<AdminBusiness[]>(`/businesses${status ? `?status=${status}` : ""}`);
  // 부스가 여러 개인 업체는 부스마다 한 줄로 온다. 업체 단위 화면이므로 대표 부스 하나만 남긴다.
  return uniqueById(rows);
}

/**
 * 운영자가 고치는 참여업체 속성.
 *
 * 광고 노출(isSponsored)과 ESG 참여(esgParticipating)는 방문객 추천 점수·광고 분리의
 * 입력값인데 설정할 화면도 API도 없어서, DB를 직접 고치지 않으면 켤 수 없었다.
 */
export function updateAdminBusiness({ businessId, version, ...body }: {
  businessId: string;
  version: number;
  category?: string;
  description?: string;
  isSponsored?: boolean;
  esgParticipating?: boolean;
}) {
  return festivalApi<AdminBusiness>(`/businesses/${businessId}`, json("PATCH", { ...body, version }));
}

export interface NewBusiness {
  registrationNo: string;
  name: string;
  category: string;
  description?: string;
  areaId?: string;
  boothNo?: string;
}

export async function createBusiness(input: NewBusiness) {
  return festivalApi(`/businesses`, json("POST", input));
}

export async function reviewBusiness({ businessId, decision, comment }: { businessId: string; decision: "APPROVED" | "REJECTED"; comment?: string }) {
  return festivalApi(`/businesses/${businessId}/review`, json("POST", { decision, comment }));
}

export interface AdminCoupon {
  id: string;
  name: string;
  description: string | null;
  benefitType: "FIXED" | "PERCENT" | "GIFT";
  benefitValue: number;
  issueLimit: number;
  perVisitorLimit: number;
  validFrom: string;
  validUntil: string;
  status: string;
  issuedCount: number;
}

export async function fetchBusinessCoupons(businessId: string) {
  return festivalApi<AdminCoupon[]>(`/businesses/${businessId}/coupons`);
}

export interface NewCoupon {
  name: string;
  description?: string;
  benefitType: "FIXED" | "PERCENT" | "GIFT";
  benefitValue: number;
  issueLimit: number;
  perVisitorLimit: number;
  startsAt: string;
  endsAt: string;
}

export async function createBusinessCoupon({ businessId, ...input }: NewCoupon & { businessId: string }) {
  return festivalApi(`/businesses/${businessId}/coupons`, json("POST", input));
}
