import { FESTIVAL_CODE, festivalApi, json, publicApi } from "@/shared/lib/api";
import type { Tone } from "@/shared/ui/status-pill";

export type CrowdLevel = "QUIET" | "MODERATE" | "BUSY" | "FULL";

export const CROWD_LEVELS: CrowdLevel[] = ["QUIET", "MODERATE", "BUSY", "FULL"];

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  QUIET: "여유",
  MODERATE: "보통",
  BUSY: "혼잡",
  FULL: "매우 혼잡",
};

export const CROWD_TONE: Record<CrowdLevel, Tone> = {
  QUIET: "success",
  MODERATE: "warning",
  BUSY: "busy",
  FULL: "danger",
};

export interface PublicCrowd {
  area_id: string;
  area_name: string;
  crowd_level: CrowdLevel;
  estimated_wait_min: number | null;
  captured_at: string;
  stale: boolean;
}

export function fetchPublicCrowd() {
  return publicApi<PublicCrowd[]>(`/public/festivals/${FESTIVAL_CODE}/crowd`);
}

export interface AdminCrowdSnapshot extends PublicCrowd {
  id: string;
  source_type: string;
  people_count: number | null;
  expires_at: string;
  program_title: string | null;
}

export async function fetchCrowdSnapshots() {
  return festivalApi<AdminCrowdSnapshot[]>(`/crowd-snapshots`);
}

export interface NewCrowdSnapshot {
  areaId: string;
  crowdLevel: CrowdLevel;
  peopleCount?: number | null;
  estimatedWaitMin?: number | null;
  validMinutes: number;
}

export async function createCrowdSnapshot({ validMinutes, ...input }: NewCrowdSnapshot) {
  const capturedAt = new Date();
  return festivalApi(`/crowd-snapshots`, json("POST", {
    ...input,
    sourceType: "MANUAL",
    capturedAt: capturedAt.toISOString(),
    // 수동 입력값은 유효기간이 지나면 stale로 표시된다 — 오래된 값을 최신처럼 보여주지 않기 위해.
    expiresAt: new Date(capturedAt.getTime() + validMinutes * 60_000).toISOString(),
  }));
}
