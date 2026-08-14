import { adminApi, adminFestivalId } from "@/shared/lib/api";

export interface OpsSnapshot {
  visitors: number;
  active_bookings: number;
  open_tickets: number;
  approved_businesses: number;
  coupon_issues: number;
  points_issued: number;
  updatedAt: string | null;
  sources: string[];
}

export async function fetchOpsSnapshot(): Promise<OpsSnapshot> {
  const festivalId = await adminFestivalId();
  const response = await adminApi<{ stats: Omit<OpsSnapshot, "updatedAt" | "sources">; updatedAt: string | null; sources: string[] }>(`/admin/festivals/${festivalId}/dashboard`);
  return { ...response.stats, updatedAt: response.updatedAt, sources: response.sources };
}
