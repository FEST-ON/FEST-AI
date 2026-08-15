import { festivalApi } from "@/shared/lib/api";

/** 언어별 이용 로그(AI-05). auto_switched는 첫 발화로 자동 전환된 세션 수. */
export interface LanguageUsage {
  language: string;
  sessions: number;
  auto_switched: number;
  kiosk_sessions: number;
}

export interface OpsSnapshot {
  visitors: number;
  active_bookings: number;
  open_tickets: number;
  approved_businesses: number;
  coupon_issues: number;
  points_issued: number;
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
