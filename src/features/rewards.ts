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
  actionType: string;
  verificationType: NewRewardAction["verificationType"];
  points: number;
  perUserLimit: number;
  rule: { name?: string; location?: string };
}

export interface RewardCampaign {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  dailyPointLimit: number;
  actions: RewardAction[];
}

export async function fetchRewardCampaigns() {
  return festivalApi<RewardCampaign[]>(`/reward-campaigns`);
}
