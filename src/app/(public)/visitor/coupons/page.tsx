"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coins, QrCode as QrCodeIcon, Store, Ticket } from "lucide-react";
import {
  fetchCouponOffers,
  fetchMyCoupons,
  fetchPoints,
  isCouponUsable,
  issueCoupon,
  reissueCouponToken,
} from "@/entities/coupon";
import { useTranslation } from "@/shared/lib/i18n";
import { useWrite } from "@/shared/lib/use-write";
import { useNow } from "@/shared/lib/use-now";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { QrCode } from "@/shared/ui/qr-code";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";

export default function CouponsPage() {
  const { t, locale, bcp47 } = useTranslation();
  // 만료 시각이 지난 쿠폰은 재조회를 기다리지 않고 사용 불가로 바뀌어야 한다.
  const now = useNow(60_000);

  const myCoupons = useQuery({ queryKey: ["my-coupons", locale] as const, queryFn: () => fetchMyCoupons(locale) });
  const offers = useQuery({ queryKey: ["coupon-offers", locale] as const, queryFn: () => fetchCouponOffers(locale) });
  const points = useQuery({ queryKey: ["visitor-points"], queryFn: fetchPoints });

  const issue = useWrite(issueCoupon, { invalidates: ["my-coupons"] });
  // 사용 토큰은 발급 응답에서만 내려오고 기기에만 남는다. 기기를 바꾸면 QR을 만들 수
  // 없어 쿠폰이 죽어 있었다 — 재발급하면 예전 토큰은 즉시 무효가 된다.
  const reissue = useWrite(reissueCouponToken, { invalidates: ["my-coupons"] });

  return (
    <div className="px-4 pb-6 pt-4">
      <h1 className="text-lg font-extrabold text-foreground">{t.coupon.title}</h1>
      <p className="text-xs text-muted-foreground">{t.coupon.subtitle}</p>

      <section className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-primary/6 p-4 dark:bg-primary/15">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary"><Coins className="size-4" /></span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t.coupons.pointsLabel}</p>
            <p className="text-xl font-extrabold text-foreground">{(points.data?.balance ?? 0).toLocaleString()}P</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[0.625rem]">{t.coupons.pointsHelper(points.data?.ledger.length ?? 0)}</Badge>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ticket className="size-4" /> {t.coupon.myCouponsTitle}
        </h2>

        {myCoupons.isLoading && <Skeleton className="h-40 rounded-2xl" />}
        {myCoupons.isError && (
          <ErrorState
            message={queryErrorMessage(myCoupons.error, t.common.loadFailed)}
            retryLabel={t.common.retry}
            onRetry={() => myCoupons.refetch()}
          />
        )}
        {myCoupons.data?.length === 0 && <EmptyState message={t.coupon.emptyMyCoupons} />}

        <div className="space-y-3">
          {myCoupons.data?.map((coupon) => {
            const usable = isCouponUsable(coupon, now);
            return (
              <article
                key={coupon.id}
                className={`rounded-2xl border p-4 ${usable ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{coupon.businessName}</p>
                    <p className="mt-0.5 text-sm font-semibold text-primary">
                      {coupon.couponName} · {t.coupon.benefitLabel(coupon.benefitType, coupon.benefitValue)}
                    </p>
                  </div>
                  <Badge variant={usable ? "default" : "outline"} className="shrink-0 text-[0.625rem]">
                    {t.coupon.status[coupon.status]}
                  </Badge>
                </div>

                {usable && coupon.issueToken && (
                  <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-3">
                    <QrCode value={coupon.issueToken} alt={t.coupon.qrAlt(coupon.businessName)} size={160} />
                    <p className="font-mono text-xs font-bold tracking-wider break-all text-center text-foreground">
                      {coupon.issueToken}
                    </p>
                    <p className="text-center text-[0.6875rem] leading-4 text-muted-foreground">{t.coupon.qrHelper}</p>
                  </div>
                )}

                {usable && !coupon.issueToken && (
                  <div className="mt-3 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                    <p className="flex items-start gap-1.5 text-[0.6875rem] leading-4 text-amber-900 dark:text-amber-100">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      {t.coupon.tokenMissing}
                    </p>
                    <Button size="sm" variant="outline" className="w-full" disabled={reissue.isPending}
                            onClick={() => reissue.mutate(coupon.id)}>
                      <QrCodeIcon className="size-3.5" /> {t.coupon.reissueButton}
                    </Button>
                    {reissue.error && (
                      <p className="text-[0.6875rem] text-destructive">{queryErrorMessage(reissue.error)}</p>
                    )}
                  </div>
                )}

                {!usable && (
                  <p className="mt-2 text-[0.6875rem] text-muted-foreground">
                    {coupon.status === "REDEEMED" ? t.coupon.usedLine : t.coupon.expiredLine}
                  </p>
                )}

                {coupon.expiresAt && (
                  <p className="mt-2 text-[0.6875rem] text-muted-foreground">
                    {t.coupon.expiresLine(new Date(coupon.expiresAt).toLocaleDateString(bcp47))}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Store className="size-4" /> {t.coupon.offersTitle}
        </h2>

        {offers.isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {offers.isError && (
          <ErrorState
            message={queryErrorMessage(offers.error, t.common.loadFailed)}
            retryLabel={t.common.retry}
            onRetry={() => offers.refetch()}
          />
        )}
        {offers.data?.length === 0 && <EmptyState message={t.coupon.emptyOffers} />}

        <div className="space-y-2">
          {offers.data?.map((offer) => {
            // 서버가 발행 쿠폰에 원본 쿠폰 ID를 내려주지 않아, 같은 업체·쿠폰명으로 보유 여부를 본다.
            const owned = myCoupons.data?.some(
              (coupon) => coupon.couponName === offer.couponName && coupon.businessName === offer.businessName) ?? false;
            const soldOut = offer.remaining <= 0;
            return (
              <div key={offer.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{offer.businessName}</p>
                  <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                    {t.coupon.remainingLabel(Math.max(0, offer.remaining))}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {offer.couponName} · {t.coupon.benefitLabel(offer.benefitType, offer.benefitValue)}
                </p>
                {offer.description && (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{offer.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.coupon.expiresLine(new Date(offer.validUntil).toLocaleDateString(bcp47))}
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  disabled={owned || soldOut || issue.isPending}
                  onClick={() => issue.mutate(offer.id)}
                >
                  <QrCodeIcon className="size-3.5" />
                  {owned ? t.coupon.alreadyIssued : soldOut ? t.coupon.soldOut : t.coupon.issueAction}
                </Button>
              </div>
            );
          })}
        </div>
        {issue.isError && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {queryErrorMessage(issue.error, t.coupon.issueFailed)}
          </p>
        )}
      </section>
    </div>
  );
}
