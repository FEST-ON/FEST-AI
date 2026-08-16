import { adminApi, festivalApi, json } from "@/shared/lib/api";

export interface AdminFestival {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  visitorMenus: Record<string, boolean>;
  transport: TransportOption[];
  version: number;
}

export const FESTIVAL_STATUSES = ["DRAFT", "PUBLISHED", "ONGOING", "ENDED", "ARCHIVED"] as const;

export async function fetchCurrentFestival() {
  return festivalApi<AdminFestival>();
}

export async function updateFestival(body: Record<string, unknown> & { version: number }) {
  return festivalApi(undefined, json("PATCH", body));
}

export interface CloneFestivalInput {
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

/** 기준정보(구역·시설·프로그램)를 그대로 가진 새 축제를 만든다. */
export async function cloneFestival(input: CloneFestivalInput) {
  return festivalApi(`/clone`, json("POST", input));
}

export interface Facility {
  id: string;
  areaId: string;
  name: string;
  facilityType: string;
  status: string;
  version: number;
}

export async function fetchFacilities() {
  return festivalApi<Facility[]>(`/facilities`);
}

export interface NewFacility {
  areaId: string;
  name: string;
  facilityType: string;
  status: string;
}

export async function createFacility(input: NewFacility) {
  return festivalApi(`/facilities`, json("POST", input));
}

export async function updateFacility({ id, ...body }: { id: string; version: number; status?: string; name?: string }) {
  return festivalApi(`/facilities/${id}`, json("PATCH", body));
}

export async function deleteFacility(id: string) {
  return festivalApi<void>(`/facilities/${id}`, { method: "DELETE" });
}

export interface ExportJob {
  jobId: string;
  status: string;
}

/** 감사 로그·운영 데이터 내보내기. 서버가 job으로 기록하고 결과는 /jobs/{id}로 확인한다. */
export async function createExport({ resourceType, format }: { resourceType: string; format: "CSV" | "JSON" }) {
  return festivalApi<ExportJob>(`/exports`, json("POST", { resourceType, format }));
}

export function fetchJob(jobId: string) {
  return adminApi<{ id: string; status: string; jobType: string; result: Record<string, unknown> | null }>(`/jobs/${jobId}`);
}

/** 방문객 지도 화면의 오시는 길. 서버 스키마(TransportOptionIn)가 받는 값 그대로다. */
export const TRANSPORT_MODES = ["지하철", "버스", "셔틀", "주차", "자전거", "도보"] as const;
export const TRANSPORT_STATUSES = ["원활", "보통", "혼잡", "지연"] as const;

export interface TransportOption {
  mode: string;
  label: string;
  detail: string;
  status: string;
}
