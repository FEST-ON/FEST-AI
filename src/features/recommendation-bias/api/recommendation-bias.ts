import { adminApi, adminFestivalId } from "@/shared/lib/api";

type ApiEnvelope<T> = { data: T };

export interface RecommendationExposureMetric {
  key: string;
  label: string;
  is_sponsored?: boolean | null;
  exposure_count: number;
  exposure_ratio: number;
  threshold: number;
  exceeded: boolean;
}

export interface RecommendationBiasReport {
  festival_id: string;
  cadence: "weekly";
  checked_at: string;
  window_started_at: string;
  window_ended_at: string;
  next_recommended_check_at: string;
  total_events: number;
  total_regular_exposures: number;
  total_sponsored_exposures: number;
  business_exposures: RecommendationExposureMetric[];
  category_exposures: RecommendationExposureMetric[];
  sponsored_business_exposures: RecommendationExposureMetric[];
  sponsored_category_exposures: RecommendationExposureMetric[];
  violations: RecommendationExposureMetric[];
  policy_version: string;
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

async function requestBiasReport(suffix: string, init?: RequestInit): Promise<RecommendationBiasReport> {
  const festivalId = await adminFestivalId();
  const payload = await adminApi<RecommendationBiasReport | ApiEnvelope<RecommendationBiasReport>>(
    `/admin/festivals/${festivalId}/recommendation-bias${suffix}`,
    { ...init, cache: "no-store" },
  );
  return unwrap<RecommendationBiasReport>(payload);
}

export function fetchRecommendationBiasReport(options: { refresh?: boolean } = {}) {
  return requestBiasReport(options.refresh ? "?refresh=true" : "");
}

export function runRecommendationBiasCheck() {
  return requestBiasReport("/check", { method: "POST" });
}
