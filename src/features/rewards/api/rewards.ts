import { festivalApi, json } from "@/shared/lib/api";

export interface NewRewardCampaign {
  name: string;
  startsAt: string;
  endsAt: string;
  dailyPointLimit: number;
}

export async function createRewardCampaign(input: NewRewardCampaign) {
  return festivalApi<{ id: string; name: string }>(`/reward-campaigns`, json("POST", input));
}

export interface NewRewardAction {
  campaignId: string;
  actionType: string;
  verificationType: "SELF" | "QR" | "STAFF";
  points: number;
  perUserLimit: number;
  /** rule.name/location은 방문객 스탬프 화면에 그대로 노출된다. */
  name: string;
  location: string;
}

export async function createRewardAction({ campaignId, name, location, ...input }: NewRewardAction) {
  return festivalApi(`/reward-campaigns/${campaignId}/actions`, json("POST", { ...input, rule: { name, location } }));
}

export interface RewardAction {
  id: string;
  action_type: string;
  verification_type: NewRewardAction["verificationType"];
  points: number;
  per_user_limit: number;
  rule: { name?: string; location?: string };
}

export interface RewardCampaign {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  daily_point_limit: number;
  actions: RewardAction[];
}

export async function fetchRewardCampaigns() {
  return festivalApi<RewardCampaign[]>(`/reward-campaigns`);
}
