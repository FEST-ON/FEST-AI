"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Leaf, Plus, Sparkles } from "lucide-react";
import {
  createRewardAction,
  createRewardCampaign,
  fetchRewardCampaigns,
  type NewRewardAction,
  type NewRewardCampaign,
} from "@/features/rewards/api/rewards";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal, seoulShort } from "@/shared/lib/utils";

const VERIFICATION_LABEL: Record<string, string> = { SELF: "자가 인증", QR: "QR 인증", STAFF: "직원 확인" };

// 백엔드가 action_type을 자유 문자열로 받지만, 표기가 흔들리면 집계가 갈라진다 — 자주 쓰는 값을 제안한다.
const ACTION_TYPES = ["REUSABLE_CUP", "TUMBLER", "RECYCLE", "PUBLIC_TRANSPORT", "WALKING_TOUR", "TRASH_PICKUP"];

function defaultCampaign(): NewRewardCampaign {
  const now = new Date();
  return { name: "", startsAt: datetimeLocal(now), endsAt: datetimeLocal(new Date(now.getTime() + 7 * 24 * 60 * 60_000)), dailyPointLimit: 500 };
}

const EMPTY_ACTION: Omit<NewRewardAction, "campaignId"> = {
  actionType: "", verificationType: "SELF", points: 50, perUserLimit: 1, name: "", location: "",
};

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const { form: campaignForm, set: campaignFormSet, field: campaignFormField, reset: resetCampaign } = useForm<NewRewardCampaign>(defaultCampaign);
  const { form: actionForm, set: actionFormSet, field: actionFormField, reset: resetAction } = useForm(EMPTY_ACTION);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const campaignsQuery = useQuery({ queryKey: ["reward-campaigns"], queryFn: fetchRewardCampaigns });
  const campaigns = campaignsQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reward-campaigns"] });

  const campaign = useMutation({
    mutationFn: createRewardCampaign,
    meta: { success: "캠페인을 만들었어요." },
    onSuccess: (created) => {
      invalidate();
      setSelectedCampaign(created.id);
      resetCampaign();
    },
  });

  const action = useMutation({
    mutationFn: createRewardAction,
    meta: { success: "리워드 활동을 추가했어요." },
    onSuccess: () => { invalidate(); resetAction(); },
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        ESG 행동 인증 캠페인과 적립 행동을 등록해요. 등록한 행동 중 자가 인증(SELF) 항목은 방문객 스탬프 투어 화면에 바로 노출됩니다.
      </p>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Leaf className="size-4 text-primary" /> 리워드 캠페인</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            campaign.mutate({
              ...campaignForm,
              startsAt: new Date(campaignForm.startsAt).toISOString(),
              endsAt: new Date(campaignForm.endsAt).toISOString(),
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="campaign-name">캠페인명</Label>
            <Input id="campaign-name" {...campaignFormField("name")} required placeholder="예: 그린한강 ESG 챌린지" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="campaign-starts">시작</Label>
            <Input id="campaign-starts" type="datetime-local" {...campaignFormField("startsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="campaign-ends">종료</Label>
            <Input id="campaign-ends" type="datetime-local" {...campaignFormField("endsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="daily-limit">1인 일일 포인트 한도</Label>
            <Input id="daily-limit" type="number" min={1} value={campaignForm.dailyPointLimit} onChange={(event) => campaignFormSet("dailyPointLimit")(Number(event.target.value))} required />
          </div>
          <div className="sm:col-span-4 flex items-center justify-end gap-3">
            {campaign.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(campaign.error)}</p>}
            <Button type="submit" size="sm" disabled={campaign.isPending}><Plus className="size-3.5" /> {campaign.isPending ? "생성 중..." : "캠페인 생성"}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">등록된 캠페인 {campaigns.length > 0 && `(${campaigns.length})`}</h2>
        <div className="mt-3">
          <QueryState query={campaignsQuery} empty="등록된 캠페인이 없어요." skeleton={<SkeletonList count={2} className="h-24 w-full rounded-xl" />}>
            {(rows) => (
              <div className="space-y-2">
                {rows.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {seoulShort(item.starts_at)} ~ {seoulShort(item.ends_at)} · 일일 {item.daily_point_limit}P
                      </span>
                    </div>
                    {item.actions.length === 0 ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">등록된 적립 행동이 없습니다.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {item.actions.map((row) => (
                          <li key={row.id} className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{row.action_type}</Badge>
                            <span className="text-foreground">{row.rule.name ?? "-"}</span>
                            <span>{row.rule.location ?? ""}</span>
                            <span>· {VERIFICATION_LABEL[row.verification_type] ?? row.verification_type}</span>
                            <span>· {row.points}P · 1인 {row.per_user_limit}회</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Sparkles className="size-4 text-primary" /> 적립 행동</h2>
        {campaignsQuery.isLoading ? (
          <Skeleton className="mt-3 h-10 w-full rounded-lg" />
        ) : campaigns.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">먼저 캠페인을 만들면 적립 행동을 추가할 수 있어요.</p>
        ) : (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              action.mutate({ ...actionForm, campaignId: selectedCampaign });
            }}
          >
            <div className="space-y-1">
              <Label>캠페인</Label>
              <Select value={selectedCampaign} onValueChange={(value) => setSelectedCampaign(String(value ?? ""))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="캠페인 선택" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-type">행동 코드</Label>
              <Input id="action-type" list="reward-action-types" value={actionForm.actionType} onChange={(event) => actionFormSet("actionType")(event.target.value.toUpperCase())} required placeholder="예: REUSABLE_CUP" />
              <datalist id="reward-action-types">
                {ACTION_TYPES.map((type) => <option key={type} value={type} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>인증 방식</Label>
              <Select value={actionForm.verificationType} onValueChange={(value) => actionFormSet("verificationType")(value as NewRewardAction["verificationType"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF">자가 인증 (방문객 화면 노출)</SelectItem>
                  <SelectItem value="QR">QR 인증</SelectItem>
                  <SelectItem value="STAFF">현장 직원 확인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-name">방문객 표시 이름</Label>
              <Input id="action-name" {...actionFormField("name")} required placeholder="예: 다회용기 사용" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-location">위치</Label>
              <Input id="action-location" {...actionFormField("location")} required placeholder="예: 푸드존 F-2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="points">포인트</Label>
                <Input id="points" type="number" min={1} value={actionForm.points} onChange={(event) => actionFormSet("points")(Number(event.target.value))} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="per-user">1인 한도</Label>
                <Input id="per-user" type="number" min={1} value={actionForm.perUserLimit} onChange={(event) => actionFormSet("perUserLimit")(Number(event.target.value))} required />
              </div>
            </div>
            <div className="sm:col-span-3 flex items-center justify-end gap-3">
              {action.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(action.error)}</p>}
              <Button type="submit" size="sm" disabled={!selectedCampaign || action.isPending}>{action.isPending ? "추가 중..." : "행동 추가"}</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
