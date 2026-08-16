import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import { uniqueById } from "@/shared/lib/utils";

export interface RecommendedBusiness {
  businessId: string;
  name: string;
  category: string;
  score: number;
  reasons: string[];
  isSponsored: boolean;
  distanceMeters: number | null;
  areaId: string | null;
  areaName: string | null;
}

export interface RecommendationResult {
  festivalId: string;
  items: RecommendedBusiness[];
  sponsoredItems: RecommendedBusiness[];
  recommendationPolicyVersion: string;
}

export interface RecommendationQuery {
  latitude?: number;
  longitude?: number;
  category?: string;
  accessibilityRequired?: boolean;
}

export function fetchBusinessRecommendations({ latitude, longitude, category, accessibilityRequired }: RecommendationQuery = {}) {
  const params = new URLSearchParams({ limit: "10" });
  // 위경도는 둘 다 있어야 서버가 받는다 — 한쪽만 보내면 400이다.
  if (latitude !== undefined && longitude !== undefined) {
    params.set("latitude", String(latitude));
    params.set("longitude", String(longitude));
  }
  if (category) params.set("category", category);
  if (accessibilityRequired) params.set("accessibilityRequired", "true");
  return publicApi<RecommendationResult>(`/public/festivals/${FESTIVAL_CODE}/business-recommendations?${params}`);
}

export interface FestivalBusiness {
  id: string;
  name: string;
  category: string;
  description: string | null;
  menu: Array<{ name?: string; price?: number }> | null;
  operatingHours: Record<string, string> | null;
  accessibility: Record<string, boolean> | null;
  boothNo: string | null;
  areaName: string | null;
}

export async function fetchFestivalBusinesses(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const rows = await publicApi<FestivalBusiness[]>(`/public/festivals/${FESTIVAL_CODE}/businesses${query}`);
  // 서버는 부스마다 한 줄을 준다(업체당 부스가 여러 개일 수 있음). 목록에서는 대표 부스 하나만 쓴다.
  return uniqueById(rows);
}

/** 브라우저 위치. 거부·미지원이면 위치 없이 추천을 받는다. */
export function currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}
