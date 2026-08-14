import { adminApi, festivalApi, json } from "@/shared/lib/api";

export interface AdminFestival {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  default_language: string;
  supported_languages: string[];
  visitor_menus: Record<string, boolean>;
  version: number;
}

export const FESTIVAL_STATUSES = ["DRAFT", "PUBLISHED", "ONGOING", "ENDED", "ARCHIVED"] as const;

export function fetchFestivals() {
  return adminApi<AdminFestival[]>("/admin/festivals");
}

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
  area_id: string;
  name: string;
  facility_type: string;
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
  return adminApi<{ id: string; status: string; job_type: string; result: Record<string, unknown> | null }>(`/jobs/${jobId}`);
}
