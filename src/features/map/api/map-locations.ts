import { adminApi, adminFestivalId, FESTIVAL_CODE, publicApi } from "@/shared/lib/api";

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
  is_visible: boolean;
  version?: number;
}

export type MapLocationInput = Omit<MapLocation, "id">;

interface PublicMapResponse {
  areas: Array<{ id: string; name: string; area_type: string; latitude: number | null; longitude: number | null; status: string }>;
  facilities: Array<{ id: string; area_id: string; name: string; facility_type: string; status: string }>;
  programs: Array<{ id: string; title: string; area_id: string }>;
}

interface AdminArea {
  id: string;
  name: string;
  area_type: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  version?: number;
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
    category: normalizeCategory(area.area_type),
    latitude: area.latitude,
    longitude: area.longitude,
    description: description ?? `${area.name} 구역`,
    is_visible: area.status === "ACTIVE",
    version: area.version,
  };
}

export async function fetchMapLocations(options: { includeHidden?: boolean } = {}): Promise<MapLocation[]> {
  if (options.includeHidden) {
    const festivalId = await adminFestivalId();
    const areas = await adminApi<AdminArea[]>(`/admin/festivals/${festivalId}/areas`);
    return areas.map((area) => areaToLocation(area)).filter((row): row is MapLocation => Boolean(row));
  }

  const map = await publicApi<PublicMapResponse>(`/public/festivals/${FESTIVAL_CODE}/map`);
  const facilitiesByArea = new Map<string, string[]>();
  const programsByArea = new Map<string, string[]>();
  map.facilities.forEach((item) => facilitiesByArea.set(item.area_id, [...(facilitiesByArea.get(item.area_id) ?? []), item.name]));
  map.programs.forEach((item) => programsByArea.set(item.area_id, [...(programsByArea.get(item.area_id) ?? []), item.title]));
  return map.areas.map((area) => {
    const details = [...(facilitiesByArea.get(area.id) ?? []), ...(programsByArea.get(area.id) ?? [])];
    return areaToLocation(area, details.length ? details.join(" · ") : `${area.name} 구역`);
  }).filter((row): row is MapLocation => Boolean(row));
}

export async function createMapLocation(input: MapLocationInput): Promise<MapLocation> {
  const festivalId = await adminFestivalId();
  const area = await adminApi<AdminArea>(`/admin/festivals/${festivalId}/areas`, {
    method: "POST",
    body: JSON.stringify({ name: input.name, areaType: input.category, latitude: input.latitude, longitude: input.longitude, status: input.is_visible ? "ACTIVE" : "INACTIVE" }),
  });
  return areaToLocation(area, input.description ?? undefined) as MapLocation;
}

export async function updateMapLocation(id: string, input: MapLocationInput & { version?: number }): Promise<MapLocation> {
  const festivalId = await adminFestivalId();
  const area = await adminApi<AdminArea>(`/admin/festivals/${festivalId}/areas/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: input.name, areaType: input.category, latitude: input.latitude, longitude: input.longitude, status: input.is_visible ? "ACTIVE" : "INACTIVE", version: input.version }),
  });
  return areaToLocation(area, input.description ?? undefined) as MapLocation;
}

export async function deleteMapLocation(id: string): Promise<void> {
  const festivalId = await adminFestivalId();
  await adminApi<void>(`/admin/festivals/${festivalId}/areas/${id}`, { method: "DELETE" });
}
