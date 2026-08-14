"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Receipt, ScanLine, Store, TrendingUp } from "lucide-react";
import {
  createMerchantCoupon,
  fetchMyBusinesses,
  fetchPerformance,
  recordBusinessEvent,
  redeemCoupon,
  reverseRedemption,
  updateMyBusiness,
  type MerchantBusiness,
  type MerchantCoupon,
} from "@/features/merchant/api/merchant";
import { PARTICIPATION_LABEL, PARTICIPATION_TONE } from "@/features/business-admin/api/businesses";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal } from "@/shared/lib/utils";

function couponDefaults(): MerchantCoupon {
  const now = new Date();
  return {
    name: "", description: "", benefitType: "PERCENT", benefitValue: 10,
    issueLimit: 50, perVisitorLimit: 1,
    startsAt: datetimeLocal(now), endsAt: datetimeLocal(new Date(now.getTime() + 7 * 24 * 60 * 60_000)),
  };
}

function PerformanceCard({ businessId }: { businessId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["merchant-performance", businessId], queryFn: () => fetchPerformance(businessId) });

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  const sales = data?.events.find((event) => event.event_type === "SALE");
  const visits = data?.events.find((event) => event.event_type === "VISIT");

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {[
        { label: "방문 이벤트", value: `${visits?.count ?? 0}건` },
        { label: "매출 건수", value: `${sales?.count ?? 0}건` },
        { label: "매출 합계", value: `${Number(sales?.sales_amount ?? 0).toLocaleString()}원` },
        { label: "쿠폰 발급/사용", value: `${data?.coupons.issued ?? 0} / ${data?.coupons.redeemed ?? 0}` },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-bold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function BusinessPanel({ business }: { business: MerchantBusiness }) {
  const queryClient = useQueryClient();
  const { form: profile, field: profileField } = useForm({ name: business.name, category: business.category, description: business.description ?? "" });
  const { form: coupon, set: couponSet, field: couponField, reset: resetCoupon } = useForm<MerchantCoupon>(couponDefaults);
  const { form: redeem, field: redeemField, reset: resetRedeem } = useForm({ issueId: "", issueToken: "" });
  const { form: reverse, field: reverseField, reset: resetReverse } = useForm({ redemptionId: "", reason: "" });
  const [sale, setSale] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["merchant-businesses"] });
    queryClient.invalidateQueries({ queryKey: ["merchant-performance", business.id] });
  };

  const save = useMutation({ mutationFn: updateMyBusiness, onSuccess: invalidate });
  const issue = useMutation({ mutationFn: createMerchantCoupon, onSuccess: () => { invalidate(); resetCoupon(); } });
  const useCoupon = useMutation({ mutationFn: redeemCoupon, onSuccess: () => { invalidate(); resetRedeem(); } });
  const cancelUse = useMutation({ mutationFn: reverseRedemption, onSuccess: () => { invalidate(); resetReverse(); } });
  const event = useMutation({ mutationFn: recordBusinessEvent, onSuccess: () => { invalidate(); setSale(""); } });

  const approved = business.participation_status === "APPROVED";

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Store className="size-4 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">{business.name}</p>
        <StatusPill tone={PARTICIPATION_TONE[business.participation_status]}>
          {PARTICIPATION_LABEL[business.participation_status]}
        </StatusPill>
        {business.booth_no && <Badge variant="outline" className="text-[10px]">부스 {business.booth_no}</Badge>}
      </div>
      {business.review_comment && <p className="text-xs text-amber-700 dark:text-amber-300">검토 의견: {business.review_comment}</p>}

      <PerformanceCard businessId={business.id} />

      <form
        className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3"
        onSubmit={(event) => { event.preventDefault(); save.mutate({ businessId: business.id, version: business.version, ...profile }); }}
      >
        <div className="space-y-1">
          <Label htmlFor={`name-${business.id}`}>업체명</Label>
          <Input id={`name-${business.id}`} {...profileField("name")} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`category-${business.id}`}>업종</Label>
          <Input id={`category-${business.id}`} {...profileField("category")} required />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor={`description-${business.id}`}>소개</Label>
          <Textarea id={`description-${business.id}`} rows={2} {...profileField("description")} />
        </div>
        <div className="sm:col-span-3 flex items-center justify-end gap-3">
          <p className="mr-auto text-[11px] text-muted-foreground">저장하면 재검수 대기 상태로 바뀝니다.</p>
          {save.error && <p className="text-xs text-destructive">{queryErrorMessage(save.error)}</p>}
          <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? "저장 중..." : "정보 저장"}</Button>
        </div>
      </form>

      {approved && (
        <>
          <form
            className="grid gap-2 border-t border-border pt-4 sm:grid-cols-6"
            onSubmit={(input) => {
              input.preventDefault();
              issue.mutate({
                ...coupon,
                businessId: business.id,
                startsAt: new Date(coupon.startsAt).toISOString(),
                endsAt: new Date(coupon.endsAt).toISOString(),
              });
            }}
          >
            <p className="sm:col-span-6 flex items-center gap-1.5 text-xs font-bold text-foreground"><BadgePercent className="size-3.5" /> 쿠폰 발행</p>
            <Input className="sm:col-span-2" placeholder="쿠폰명" {...couponField("name")} required />
            <Select value={coupon.benefitType} onValueChange={(value) => couponSet("benefitType")(value as MerchantCoupon["benefitType"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">% 할인</SelectItem>
                <SelectItem value="FIXED">정액 할인</SelectItem>
                <SelectItem value="GIFT">사은품</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min={0} placeholder="혜택값" value={coupon.benefitValue} onChange={(event) => couponSet("benefitValue")(Number(event.target.value))} required />
            <Input type="number" min={1} placeholder="수량" value={coupon.issueLimit} onChange={(event) => couponSet("issueLimit")(Number(event.target.value))} required />
            <Input type="number" min={1} placeholder="1인 한도" value={coupon.perVisitorLimit} onChange={(event) => couponSet("perVisitorLimit")(Number(event.target.value))} required />
            <Input className="sm:col-span-3" type="datetime-local" {...couponField("startsAt")} required />
            <Input className="sm:col-span-3" type="datetime-local" {...couponField("endsAt")} required />
            <div className="sm:col-span-6 flex items-center justify-end gap-3">
              {issue.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(issue.error)}</p>}
              <Button type="submit" size="sm" disabled={issue.isPending}>{issue.isPending ? "발행 중..." : "쿠폰 발행"}</Button>
            </div>
          </form>

          <form
            className="grid gap-2 border-t border-border pt-4 sm:grid-cols-4"
            onSubmit={(input) => { input.preventDefault(); useCoupon.mutate(redeem); }}
          >
            <p className="sm:col-span-4 flex items-center gap-1.5 text-xs font-bold text-foreground"><ScanLine className="size-3.5" /> 쿠폰 사용 처리</p>
            <Input placeholder="발급 ID" {...redeemField("issueId")} required />
            <Input className="sm:col-span-2" placeholder="쿠폰 토큰 (cp_...)" {...redeemField("issueToken")} required />
            <Button type="submit" size="sm" disabled={useCoupon.isPending}>사용 처리</Button>
            {useCoupon.error && <p className="sm:col-span-4 text-xs text-destructive">{queryErrorMessage(useCoupon.error)}</p>}
            {useCoupon.data && <p className="sm:col-span-4 text-xs text-emerald-600">사용 처리 완료 · 취소용 ID {useCoupon.data.id}</p>}
          </form>

          <form
            className="grid gap-2 sm:grid-cols-4"
            onSubmit={(input) => { input.preventDefault(); cancelUse.mutate(reverse); }}
          >
            <Input placeholder="사용 내역 ID" {...reverseField("redemptionId")} required />
            <Input className="sm:col-span-2" placeholder="취소 사유" {...reverseField("reason")} required />
            <Button type="submit" size="sm" variant="outline" disabled={cancelUse.isPending}>사용 취소</Button>
            {cancelUse.error && <p className="sm:col-span-4 text-xs text-destructive">{queryErrorMessage(cancelUse.error)}</p>}
          </form>

          <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-4">
            <p className="sm:col-span-4 flex items-center gap-1.5 text-xs font-bold text-foreground"><Receipt className="size-3.5" /> 매출·방문 기록</p>
            <Input className="sm:col-span-2" type="number" min={0} placeholder="매출 금액(원)" value={sale} onChange={(input) => setSale(input.target.value)} />
            <Button size="sm" variant="outline" disabled={!sale || event.isPending} onClick={() => event.mutate({ businessId: business.id, eventType: "SALE", salesAmount: Number(sale) })}>
              <TrendingUp className="size-3.5" /> 매출 기록
            </Button>
            <Button size="sm" variant="outline" disabled={event.isPending} onClick={() => event.mutate({ businessId: business.id, eventType: "VISIT" })}>
              방문 기록
            </Button>
            {event.error && <p className="sm:col-span-4 text-xs text-destructive">{queryErrorMessage(event.error)}</p>}
          </div>
        </>
      )}
    </article>
  );
}

export default function MerchantPage() {
  const businesses = useQuery({ queryKey: ["merchant-businesses"], queryFn: fetchMyBusinesses });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        내 업체 정보와 쿠폰, 매출 성과를 관리해요. 정보를 수정하면 축제 담당자의 재검수를 거칩니다.
      </p>

      {businesses.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : businesses.isError ? (
        <ErrorState
          message={`업체 정보를 불러오지 못했습니다. 참여업체(MERCHANT) 계정으로 로그인했는지 확인해 주세요. (${queryErrorMessage(businesses.error)})`}
          onRetry={() => businesses.refetch()}
        />
      ) : businesses.data?.length === 0 ? (
        <EmptyState message="연결된 업체가 없어요. 축제 담당자에게 업체 등록을 요청하세요." />
      ) : (
        <div className="space-y-4">
          {businesses.data?.map((business) => <BusinessPanel key={business.id} business={business} />)}
        </div>
      )}
    </div>
  );
}
