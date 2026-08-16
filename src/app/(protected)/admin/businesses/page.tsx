"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Plus, Store } from "lucide-react";
import {
  createBusiness,
  createBusinessCoupon,
  fetchAdminBusinesses,
  fetchBusinessCoupons,
  PARTICIPATION_LABEL,
  PARTICIPATION_TONE,
  reviewBusiness,
  updateAdminBusiness,
  type AdminBusiness,
  type NewBusiness,
  type NewCoupon,
} from "@/features/business-admin";
import { fetchAreas } from "@/features/map/api/map-locations";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { Switch } from "@/shared/ui/switch";
import { datetimeLocal } from "@/shared/lib/utils";
import { useForm } from "@/shared/lib/use-form";

const EMPTY_BUSINESS: NewBusiness = { registrationNo: "", name: "", category: "", description: "" };

function couponDefaults(): NewCoupon {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
  return {
    name: "", description: "", benefitType: "PERCENT", benefitValue: 10,
    issueLimit: 100, perVisitorLimit: 1, startsAt: datetimeLocal(now), endsAt: datetimeLocal(week),
  };
}

function CouponPanel({ business }: { business: AdminBusiness }) {
  const queryClient = useQueryClient();
  const { form, set, field, reset } = useForm<NewCoupon>(couponDefaults);
  const coupons = useQuery({ queryKey: ["business-coupons", business.id], queryFn: () => fetchBusinessCoupons(business.id) });
  const create = useMutation({
    mutationFn: createBusinessCoupon,
    meta: { success: "쿠폰을 발행했어요." },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-coupons", business.id] });
      reset();
    },
  });

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground"><BadgePercent className="size-3.5" /> 쿠폰 발행</p>

      <QueryState
        query={coupons}
        className="mt-2"
        empty="발행한 쿠폰이 없습니다."
        skeleton={<Skeleton className="mt-2 h-10 w-full rounded-lg" />}
      >
        {(rows) => (
          <ul className="mt-2 space-y-1">
            {rows.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground">{coupon.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {coupon.issuedCount}/{coupon.issueLimit}장 발급 · {coupon.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {business.participationStatus !== "APPROVED" ? (
        <p className="mt-2 text-[11px] text-muted-foreground">승인된 업체만 쿠폰을 발행할 수 있어요.</p>
      ) : (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({
              ...form,
              businessId: business.id,
              startsAt: new Date(form.startsAt).toISOString(),
              endsAt: new Date(form.endsAt).toISOString(),
            });
          }}
        >
          <Input className="sm:col-span-2" placeholder="쿠폰명" {...field("name")} required />
          <Select value={form.benefitType} onValueChange={(value) => set("benefitType")(value as NewCoupon["benefitType"])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">% 할인</SelectItem>
              <SelectItem value="FIXED">정액 할인</SelectItem>
              <SelectItem value="GIFT">사은품</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min={0} placeholder="혜택값" value={form.benefitValue} onChange={(event) => set("benefitValue")(Number(event.target.value))} required />
          <Input type="number" min={1} placeholder="발급 수량" value={form.issueLimit} onChange={(event) => set("issueLimit")(Number(event.target.value))} required />
          <Input type="number" min={1} placeholder="1인 한도" value={form.perVisitorLimit} onChange={(event) => set("perVisitorLimit")(Number(event.target.value))} required />
          <Input className="sm:col-span-3" type="datetime-local" {...field("startsAt")} required />
          <Input className="sm:col-span-3" type="datetime-local" {...field("endsAt")} required />
          <div className="sm:col-span-6 flex items-center justify-end gap-3">
            {create.error && <p className="mr-auto text-[11px] text-destructive">{queryErrorMessage(create.error)}</p>}
            <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? "발행 중..." : "쿠폰 발행"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

const STATUS_FILTERS = ["심사 대기", "승인", "전체"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function matchesStatus(status: string, filter: StatusFilter) {
  if (filter === "전체") return true;
  if (filter === "승인") return status === "APPROVED";
  return status === "SUBMITTED" || status === "REJECTED" || status === "DRAFT";
}

export default function BusinessesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("심사 대기");
  const [creating, setCreating] = useState(false);
  const { form, set, field, reset } = useForm<NewBusiness>(EMPTY_BUSINESS);
  const [openCoupons, setOpenCoupons] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });
  const businesses = useQuery({ queryKey: ["admin-businesses"], queryFn: () => fetchAdminBusinesses() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    queryClient.invalidateQueries({ queryKey: ["ops-snapshot"] });
  };
  const register = useMutation({ mutationFn: createBusiness, meta: { success: "참여업체를 등록했어요." }, onSuccess: () => { invalidate(); reset(); setCreating(false); } });
  const review = useMutation({ mutationFn: reviewBusiness, meta: { success: "심사 결과를 반영했어요." }, onSuccess: invalidate });
  const flags = useMutation({ mutationFn: updateAdminBusiness, meta: { success: "노출 설정을 변경했어요." }, onSuccess: invalidate });

  const visible = (businesses.data ?? []).filter((row) => matchesStatus(row.participationStatus, statusFilter));
  // 업종은 백엔드가 자유 문자열로 받는다 — 이미 쓰인 값을 제안해 표기가 갈라지는 걸 막는다.
  const categories = [...new Set((businesses.data ?? []).map((row) => row.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          참여업체 신청을 검토·승인하고, 승인된 업체의 디지털 쿠폰을 발행해요. 승인된 업체만 방문객 추천과 지도에 노출됩니다.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-3.5" /> 업체 등록</Button>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>참여업체 등록</DialogTitle>
            <DialogDescription>등록 후 심사에서 승인해야 방문객 추천과 지도에 노출됩니다.</DialogDescription>
          </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate({ ...form, areaId: form.areaId || undefined, boothNo: form.boothNo || undefined });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="registration">사업자번호</Label>
            <Input id="registration" {...field("registrationNo")} required placeholder="123-45-67890" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="business-name">업체명</Label>
            <Input id="business-name" {...field("name")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="business-category">업종</Label>
            <Input id="business-category" list="business-categories" {...field("category")} required placeholder="예: 베이커리" />
            <datalist id="business-categories">
              {categories.map((category) => <option key={category} value={category} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label>부스 구역</Label>
            <Select value={form.areaId ?? "none"} onValueChange={(value) => set("areaId")(!value || value === "none" ? undefined : String(value))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">미지정</SelectItem>
                {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="booth">부스 번호</Label>
            <Input id="booth" {...field("boothNo")} placeholder="예: G-1" />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="business-description">소개</Label>
            <Textarea id="business-description" rows={2} {...field("description")} />
          </div>
          <div className="sm:col-span-3 flex items-center justify-end gap-3">
            {register.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(register.error)}</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>취소</Button>
            <Button type="submit" size="sm" disabled={register.isPending}>{register.isPending ? "등록 중..." : "등록"}</Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList>
          {STATUS_FILTERS.map((value) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {value}
              <span className="text-[10px] text-muted-foreground">
                {(businesses.data ?? []).filter((row) => matchesStatus(row.participationStatus, value)).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <QueryState
        query={businesses}
        empty="표시할 참여업체가 없어요."
        emptyWhen={visible.length === 0}
        skeleton={<SkeletonList count={3} className="h-28 w-full rounded-2xl" />}
      >
        {() => (
          <div className="space-y-3">
            {visible.map((business) => (
              <article key={business.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Store className="size-4 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">{business.name}</p>
                      <Badge variant="outline" className="text-[10px]">{business.category}</Badge>
                      <StatusPill tone={PARTICIPATION_TONE[business.participationStatus]}>
                        {PARTICIPATION_LABEL[business.participationStatus]}
                      </StatusPill>
                      {business.isSponsored && <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">광고</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      사업자 {business.registrationNo}
                      {business.boothNo && ` · 부스 ${business.boothNo}`}
                    </p>
                    {business.description && <p className="mt-1 text-xs text-muted-foreground">{business.description}</p>}
                    {business.reviewComment && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">검토 의견: {business.reviewComment}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenCoupons(openCoupons === business.id ? null : business.id)}>
                    <BadgePercent className="size-3.5" /> 쿠폰
                  </Button>
                </div>

                {/* 광고 노출·ESG 참여는 방문객 추천 점수와 광고 영역 분리에 그대로 쓰인다.
                    설정할 곳이 없어 DB를 직접 고쳐야 했던 값이다. */}
                {business.participationStatus === "APPROVED" && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <Switch
                        checked={business.isSponsored}
                        disabled={flags.isPending && flags.variables?.businessId === business.id}
                        onCheckedChange={(checked) => flags.mutate({ businessId: business.id, version: business.version, isSponsored: checked })}
                      />
                      광고 노출
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <Switch
                        checked={business.esgParticipating}
                        disabled={flags.isPending && flags.variables?.businessId === business.id}
                        onCheckedChange={(checked) => flags.mutate({ businessId: business.id, version: business.version, esgParticipating: checked })}
                      />
                      ESG·지역상생 참여
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      광고는 방문객 추천에서 별도 영역으로 분리되고, ESG 참여는 추천 점수에 가산돼요.
                    </p>
                  </div>
                )}

                {(business.participationStatus === "SUBMITTED" || business.participationStatus === "REJECTED") && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Input
                      className="min-w-40 flex-1"
                      placeholder="검토 의견(선택)"
                      value={comment[business.id] ?? ""}
                      onChange={(event) => setComment({ ...comment, [business.id]: event.target.value })}
                    />
                    <Button size="sm" disabled={review.isPending && review.variables?.businessId === business.id} onClick={() => review.mutate({ businessId: business.id, decision: "APPROVED", comment: comment[business.id] })}>
                      승인
                    </Button>
                    <Button size="sm" variant="destructive" disabled={review.isPending && review.variables?.businessId === business.id} onClick={() => review.mutate({ businessId: business.id, decision: "REJECTED", comment: comment[business.id] })}>
                      반려
                    </Button>
                  </div>
                )}

                {openCoupons === business.id && <CouponPanel business={business} />}
              </article>
            ))}
            {review.error && <p className="text-sm text-destructive">{queryErrorMessage(review.error)}</p>}
          </div>
        )}
      </QueryState>
    </div>
  );
}
