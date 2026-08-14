"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Coins, Ticket } from "lucide-react";
import { benefitLabel, fetchAvailableCoupons, fetchMyCoupons, fetchPoints, issueCoupon } from "@/entities/coupon";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { useTranslation } from "@/shared/lib/i18n";

export default function VisitorCouponsPage() {
  const { t, locale, bcp47 } = useTranslation();
  const queryClient = useQueryClient();

  const available = useQuery({ queryKey: ["available-coupons", locale] as const, queryFn: () => fetchAvailableCoupons(locale) });
  const mine = useQuery({ queryKey: ["my-coupons", locale] as const, queryFn: () => fetchMyCoupons(locale) });
  const points = useQuery({ queryKey: ["visitor-points"], queryFn: fetchPoints });

  const issue = useMutation({
    mutationFn: issueCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["available-coupons"] });
    },
  });

  // 쿠폰 유효기간은 해를 넘기는 경우가 있어 연도까지 보여준다.
  const date = (value: string) => new Date(value).toLocaleDateString(bcp47, { year: "2-digit", month: "numeric", day: "numeric" });

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.coupons.title}</h1>
      <p className="text-xs text-muted-foreground">{t.coupons.subtitle}</p>

      <section className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-primary/6 p-4 dark:bg-primary/15">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary"><Coins className="size-4" /></span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t.coupons.pointsLabel}</p>
            <p className="text-xl font-extrabold text-foreground">{(points.data?.balance ?? 0).toLocaleString()}P</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{t.coupons.pointsHelper(points.data?.ledger.length ?? 0)}</Badge>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <BadgePercent className="size-4" /> {t.coupons.availableTitle}
        </h2>
        <QueryState query={available} empty={t.coupons.availableEmpty} retryLabel={t.common.retry} skeleton={
            <div className="space-y-2"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
          }>
          {(rows) => (
            <div className="space-y-2">
              {rows.map((coupon) => (
                <div key={coupon.id} className="rounded-xl border border-primary/30 bg-primary/6 p-3 dark:bg-primary/15">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{coupon.name}</p>
                      <p className="text-xs text-muted-foreground">{coupon.business_name}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t.coupons.remaining(coupon.remaining)}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-primary">{benefitLabel(coupon.benefit_type, coupon.benefit_value)}</p>
                  {coupon.description && <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{t.coupons.validUntil(date(coupon.valid_until))}</span>
                    <Button size="sm" disabled={issue.isPending || coupon.remaining <= 0} onClick={() => issue.mutate(coupon.id)}>
                      <Ticket className="size-3.5" /> {t.coupons.issueButton}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryState>
        {issue.error && <p className="mt-2 text-xs text-destructive" role="alert">{queryErrorMessage(issue.error)}</p>}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ticket className="size-4" /> {t.coupons.myTitle}
        </h2>
        <QueryState query={mine} empty={t.coupons.myEmpty} retryLabel={t.common.retry} skeleton={<Skeleton className="h-20 rounded-xl" />}>
          {(rows) => (
            <div className="space-y-2">
              {rows.map((coupon) => {
                const used = coupon.status !== "ISSUED";
                return (
                  <div key={coupon.id} className={`rounded-xl border p-3 ${used ? "border-border bg-muted/50 opacity-60" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{coupon.name}</p>
                      <Badge variant={used ? "secondary" : "default"} className="shrink-0 text-[10px]">
                        {t.coupons.status[coupon.status] ?? coupon.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-primary">{benefitLabel(coupon.benefit_type, coupon.benefit_value)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{coupon.business_name} · {t.coupons.validUntil(date(coupon.expires_at))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </QueryState>
        <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
          {t.coupons.redeemNotice}
        </p>
      </section>
    </div>
  );
}
