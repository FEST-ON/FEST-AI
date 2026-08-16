import { festivalApi } from "@/shared/lib/api";

/** 언어별 이용 로그(AI-05). auto_switched는 첫 발화로 자동 전환된 세션 수. */
export interface LanguageUsage {
  language: string;
  sessions: number;
  autoSwitched: number;
  kioskSessions: number;
}

export interface OpsSnapshot {
  visitors: number;
  activeBookings: number;
  openTickets: number;
  approvedBusinesses: number;
  couponIssues: number;
  pointsIssued: number;
  languages: LanguageUsage[];
  updatedAt: string | null;
  sources: string[];
}

export async function fetchOpsSnapshot(): Promise<OpsSnapshot> {
  const response = await festivalApi<{
    stats: Omit<OpsSnapshot, "languages" | "updatedAt" | "sources">;
    languages: LanguageUsage[];
    updatedAt: string | null;
    sources: string[];
  }>(`/dashboard`);
  return { ...response.stats, languages: response.languages, updatedAt: response.updatedAt, sources: response.sources };
}
