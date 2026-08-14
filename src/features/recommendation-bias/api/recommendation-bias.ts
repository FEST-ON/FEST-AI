import { festivalApi } from "@/shared/lib/api";

export interface BusinessExposure {
  business_id: string;
  name: string;
  category: string;
  total_exposures: number;
  sponsored_exposures: number;
  exposure_share: number;
  is_over_threshold: boolean;
}

export interface CategoryExposure {
  category: string;
  total_exposures: number;
  exposure_share: number;
  is_over_threshold: boolean;
}

export interface RecommendationBiasReport {
  festival_id: string;
  window_days: number;
  status: "PASS" | "WARNING" | "INSUFFICIENT_DATA";
  summary: string;
  checked_event_count: number;
  total_exposures: number;
  sponsored_exposures: number;
  business_exposures: BusinessExposure[];
  category_exposures: CategoryExposure[];
  thresholds: { max_business_exposure_share: number; max_category_exposure_share: number };
  recommended_actions: string[];
}

/** 백엔드는 GET 한 번으로 최근 window_days의 노출 이력을 그때그때 집계한다(저장된 리포트가 아니다). */
export async function fetchRecommendationBiasReport(windowDays = 7) {
  return festivalApi<RecommendationBiasReport>(`/recommendation-bias?windowDays=${windowDays}`, { cache: "no-store" });
}
