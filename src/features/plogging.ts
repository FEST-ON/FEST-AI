import { writeJson } from "@/shared/lib/local-store";
import { useStored } from "@/shared/lib/use-stored";
import { randomId, shortCode } from "@/shared/lib/utils";

export const PLOGGING_POINTS_PER_BAG = 30;
export const PLOGGING_STORAGE_KEY = "festai-plogging-submissions";

export interface PloggingSubmission {
  id: string;
  submissionCode: string;
  visitorCode: string;
  bagCount: number;
  location: string;
  verifiedAt: string;
  points: number;
  operatorEmail: string;
}

export interface NewPloggingSubmission {
  visitorCode: string;
  bagCount: number;
  location: string;
  operatorEmail: string;
}

const EMPTY: PloggingSubmission[] = [];

export function writePloggingSubmissions(submissions: PloggingSubmission[]) {
  writeJson(PLOGGING_STORAGE_KEY, submissions);
}

/** 인증 내역 구독. 같은 탭의 인증 등록과 다른 탭의 변경이 모두 반영된다. */
export function usePloggingSubmissions() {
  return useStored(PLOGGING_STORAGE_KEY, EMPTY);
}

// 안내원이 방문객 QR을 스캔한 자리에서 바로 봉투 수를 확인해 인증하므로,
// 대여/반납과 달리 대기 상태 없이 인증과 포인트 적립이 한 번에 끝난다.
export function createPloggingSubmission(input: NewPloggingSubmission): PloggingSubmission {
  const bagCount = Math.max(1, input.bagCount);
  return {
    id: randomId("plogging"),
    submissionCode: shortCode("PL"),
    visitorCode: input.visitorCode.trim().toUpperCase(),
    bagCount,
    location: input.location,
    verifiedAt: new Date().toISOString(),
    points: bagCount * PLOGGING_POINTS_PER_BAG,
    operatorEmail: input.operatorEmail,
  };
}

export function ploggingPoints(submissions: PloggingSubmission[]) {
  return submissions.reduce((total, submission) => total + submission.points, 0);
}
