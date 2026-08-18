import { FESTIVAL_CODE, festivalApi, json, publicApi } from "@/shared/lib/api";
import type { Locale } from "@/shared/lib/i18n";
import { translateEntries } from "@/shared/lib/i18n/translate-client";

export const MAP_LOCATION_CATEGORIES = [
  { value: "BOOTH", label: "판매 부스" },
  { value: "PROGRAM", label: "프로그램" },
  { value: "FOOD", label: "푸드존" },
  { value: "FACILITY", label: "편의시설" },
  { value: "PARKING", label: "주차장" },
] as const;

export type MapLocationCategory = (typeof MAP_LOCATION_CATEGORIES)[number]["value"];

export interface MapLocation {
  id: string;
  name: string;
  category: MapLocationCategory;
  latitude: number;
  longitude: number;
  description?: string | null;
  isVisible: boolean;
  version?: number;
}

export type MapLocationInput = Omit<MapLocation, "id">;

interface PublicMapResponse {
  areas: Array<{ id: string; name: string; areaType: string; description?: string | null; latitude: number | null; longitude: number | null; status: string }>;
  facilities: Array<{ id: string; areaId: string; name: string; facilityType: string; status: string }>;
  programs: Array<{ id: string; title: string; areaId: string }>;
}

export interface AdminArea {
  id: string;
  name: string;
  areaType: string;
  description?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  version?: number;
}

/** 구역 목록은 티켓·혼잡도·인력 배치·부스 화면이 모두 쓰는 기준정보다. */
export async function fetchAreas() {
  return festivalApi<AdminArea[]>(`/areas`);
}

function normalizeCategory(value: string): MapLocationCategory {
  const upper = value.toUpperCase();
  if (upper.includes("FOOD")) return "FOOD";
  if (upper.includes("PARK")) return "PARKING";
  if (upper.includes("FACILITY") || upper.includes("TOILET") || upper.includes("INFO")) return "FACILITY";
  if (upper.includes("PROGRAM") || upper.includes("STAGE")) return "PROGRAM";
  return "BOOTH";
}

function areaToLocation(area: AdminArea, description?: string): MapLocation | null {
  if (area.latitude == null || area.longitude == null) return null;
  return {
    id: area.id,
    name: area.name,
    category: normalizeCategory(area.areaType),
    latitude: area.latitude,
    longitude: area.longitude,
    // 운영자가 적은 설명이 우선. 없으면 시설·프로그램 요약을, 그것도 없으면 구역 이름을 쓴다.
    description: area.description || description || `${area.name} 구역`,
    isVisible: area.status === "ACTIVE",
    version: area.version,
  };
}

export async function fetchMapLocations(options: { includeHidden?: boolean; locale?: Locale } = {}): Promise<MapLocation[]> {
  // includeHidden은 관리자 지도 편집 화면 전용이라 번역하지 않는다(관리자 화면엔 i18n이 없다).
  if (options.includeHidden) {
    const areas = await festivalApi<AdminArea[]>(`/areas`);
    return areas.map((area) => areaToLocation(area)).filter((row): row is MapLocation => Boolean(row));
  }

  const map = await publicApi<PublicMapResponse>(`/public/festivals/${FESTIVAL_CODE}/map`);
  const facilitiesByArea = new Map<string, string[]>();
  const programsByArea = new Map<string, string[]>();
  map.facilities.forEach((item) => facilitiesByArea.set(item.areaId, [...(facilitiesByArea.get(item.areaId) ?? []), item.name]));
  map.programs.forEach((item) => programsByArea.set(item.areaId, [...(programsByArea.get(item.areaId) ?? []), item.title]));
  const locations = map.areas.map((area) => {
    const details = [...(facilitiesByArea.get(area.id) ?? []), ...(programsByArea.get(area.id) ?? [])];
    return areaToLocation(area, details.length ? details.join(" · ") : `${area.name} 구역`);
  }).filter((row): row is MapLocation => Boolean(row));

  const locale = options.locale ?? "ko";
  if (locale === "ko" || locations.length === 0) return locations;
  const entries: Record<string, string> = {};
  locations.forEach((location) => {
    entries[`${location.id}.name`] = location.name;
    if (location.description) entries[`${location.id}.description`] = location.description;
  });
  const translated = await translateEntries(entries, locale);
  return locations.map((location) => ({
    ...location,
    name: translated[`${location.id}.name`] ?? location.name,
    description: location.description ? (translated[`${location.id}.description`] ?? location.description) : location.description,
  }));
}

function areaBody(input: MapLocationInput & { version?: number }) {
  return {
    name: input.name,
    areaType: input.category,
    // 예전에는 description을 보내지 않아 운영자가 적은 설명이 매번 버려졌다.
    description: input.description ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.isVisible ? "ACTIVE" : "INACTIVE",
    version: input.version,
  };
}

export async function createMapLocation(input: MapLocationInput): Promise<MapLocation> {
  const area = await festivalApi<AdminArea>(`/areas`, json("POST", areaBody(input)));
  return areaToLocation(area) as MapLocation;
}

export async function updateMapLocation(id: string, input: MapLocationInput & { version?: number }): Promise<MapLocation> {
  const area = await festivalApi<AdminArea>(`/areas/${id}`, json("PATCH", areaBody(input)));
  return areaToLocation(area) as MapLocation;
}

export async function deleteMapLocation(id: string): Promise<void> {
  await festivalApi<void>(`/areas/${id}`, { method: "DELETE" });
}
