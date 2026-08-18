export const PLOGGING_OPERATOR_EMAIL = "operator@example.com";
export const PLOGGING_POINTS_PER_BAG = 30;
export const PLOGGING_STORAGE_KEY = "festai-plogging-submissions";
export const PLOGGING_UPDATED_EVENT = "festai-plogging-updated";

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

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PLOGGING_UPDATED_EVENT));
}

export function readPloggingSubmissions(): PloggingSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLOGGING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PloggingSubmission[]) : [];
  } catch {
    return [];
  }
}

export function writePloggingSubmissions(submissions: PloggingSubmission[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLOGGING_STORAGE_KEY, JSON.stringify(submissions));
  notifyUpdated();
}

// 안내원이 방문객 QR을 스캔한 자리에서 바로 봉투 수를 확인해 인증하므로,
// 대여/반납과 달리 대기 상태 없이 인증과 포인트 적립이 한 번에 끝난다.
export function createPloggingSubmission(input: NewPloggingSubmission): PloggingSubmission {
  const bagCount = Math.max(1, input.bagCount);
  return {
    id: newId("plogging"),
    submissionCode: `PL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
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
