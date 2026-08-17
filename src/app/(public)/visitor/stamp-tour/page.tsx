"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Stamp, MapPin, Coins, QrCode, Ticket, PartyPopper } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Form, SubmitButton } from "@/shared/ui/form";
import { useWrite } from "@/shared/lib/use-write";
import { QrScanner } from "@/shared/ui/qr-scanner";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { collectStamp, fetchStampSpots, fetchMyCoupons, fetchPoints, isCouponUsable } from "@/entities/coupon";
import { useTranslation } from "@/shared/lib/i18n";
import { useNow } from "@/shared/lib/use-now";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";

export default function StampTourPage() {
  const { t, locale, bcp47 } = useTranslation();
  const [scanningSpot, setScanningSpot] = useState<string | null>(null);
  const [stampCode, setStampCode] = useState("");
  const { data: stampSpots = [], error: spotsError, refetch: refetchSpots } = useQuery({
    queryKey: ["stamp-spots", locale] as const,
    queryFn: () => fetchStampSpots(locale),
  });
  const collectMutation = useWrite(collectStamp, { invalidates: ["stamp-spots", "visitor-points"] });
  // 발행받은 쿠폰은 쿠폰함(/visitor/coupons)이 원본이고, 여기서는 최근 것만 요약해 보여준다.
  const now = useNow(60_000);
  const { data: myCoupons = [] } = useQuery({
    queryKey: ["my-coupons", locale] as const,
    queryFn: () => fetchMyCoupons(locale),
  });
  const { data: points } = useQuery({ queryKey: ["visitor-points"], queryFn: fetchPoints });
  const total = stampSpots.length;
  const collected = stampSpots.filter((spot) => spot.collected).length;
  const complete = total > 0 && collected >= total;

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.stampTour.title}</h1>
      <p className="text-xs text-muted-foreground">{t.stampTour.subtitle}</p>

      <div className="mt-4 flex flex-col items-center rounded-2xl border border-border bg-card py-6">
        <ProgressRing value={total ? (collected / total) * 100 : 0} label={`${collected}/${total}`} sublabel={t.stampTour.collectionSubLabel} />
        {complete && (
          <Badge className="mt-3 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
            <PartyPopper className="size-3.5" /> {t.stampTour.completeBadge}
          </Badge>
        )}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-foreground">{t.stampTour.spotsTitle}</h2>
        <div className="space-y-2">
          {spotsError && <ErrorState message={queryErrorMessage(spotsError)} onRetry={() => refetchSpots()} />}
          {collectMutation.error && (
            <p className="text-xs text-destructive" role="alert">{queryErrorMessage(collectMutation.error)}</p>
          )}
          {stampSpots.map((spot) => {
            const done = spot.collected;
            return (
              <div key={spot.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full ${
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Stamp className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{spot.name}</p>
                    <p className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {spot.location}
                    </p>
                  </div>
                </div>
                {done || spot.verificationType === "SELF" ? (
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "default"}
                    disabled={done || collectMutation.isPending}
                    onClick={() => collectMutation.mutate({ actionId: spot.id, verificationKey: `stamp:${spot.id}` })}
                  >
                    {done ? t.stampTour.doneButton : t.stampTour.stampButton}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={scanningSpot === spot.id ? "outline" : "default"}
                    disabled={collectMutation.isPending}
                    onClick={() => setScanningSpot(scanningSpot === spot.id ? null : spot.id)}
                  >
                    <QrCode className="size-3.5" />
                    {scanningSpot === spot.id ? t.common.cancel : t.stampTour.stampButton}
                  </Button>
                )}
              </div>
            );
          })}
          {/* 현장 QR 인증. 스캔한 값이 그대로 인증 키가 되고, 틀리면 서버가 막는다.
              QrScanner는 BarcodeDetector가 없는 브라우저(사파리)에서 아무것도 그리지 않으므로
              코드 직접 입력이 반드시 함께 있어야 한다 — 없으면 아이폰에서 스탬프를 못 찍는다. */}
          {scanningSpot && (
            <div className="rounded-xl border border-border bg-card p-3">
              <QrScanner
                label={t.stampTour.scanButton}
                onScan={(value) => {
                  setScanningSpot(null);
                  collectMutation.mutate({ actionId: scanningSpot, verificationKey: value.trim() });
                }}
              />
              <Form
                className="mt-2 space-y-2"
                onSubmit={() => {
                  const key = stampCode.trim();
                  if (!key) return;
                  setScanningSpot(null);
                  setStampCode("");
                  collectMutation.mutate({ actionId: scanningSpot, verificationKey: key });
                }}
              >
                <Label htmlFor="stamp-code">{t.stampTour.codeLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="stamp-code"
                    value={stampCode}
                    onChange={(event) => setStampCode(event.target.value)}
                    placeholder="stamp:..."
                    autoComplete="off"
                    className="min-w-40 flex-1"
                  />
                  <SubmitButton mutation={collectMutation} disabled={!stampCode.trim()}>
                    {t.stampTour.stampButton}
                  </SubmitButton>
                </div>
              </Form>
              <p className="mt-2 text-[0.6875rem] text-muted-foreground">{t.stampTour.scanHint}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Coins className="size-4" /> {t.stampTour.pointsTitle}
          </h2>
          <Link href="/visitor/coupons" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            {t.stampTour.couponsLink} <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t.stampTour.pointsBalance}</p>
          <p className="text-2xl font-extrabold text-foreground">{(points?.balance ?? 0).toLocaleString()}P</p>
          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
            {(points?.ledger ?? []).slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{entry.reason}</span>
                <span className="shrink-0 font-bold text-primary">+{entry.pointsDelta}P</span>
              </li>
            ))}
            {(points?.ledger.length ?? 0) === 0 && (
              <li className="text-center text-xs text-muted-foreground">{t.stampTour.pointsEmpty}</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Ticket className="size-4" /> {t.stampTour.couponsTitle}
          </h2>
          <Link href="/visitor/coupons" className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
            {t.stampTour.couponsLink} <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {myCoupons.length === 0 && <EmptyState message={t.stampTour.emptyCoupons} />}
          {myCoupons.slice(0, 3).map((coupon) => {
            const usable = isCouponUsable(coupon, now);
            return (
              <Link
                key={coupon.id}
                href="/visitor/coupons"
                className={`block rounded-xl border p-3 ${usable ? "border-primary/30 bg-primary/6 dark:bg-primary/15" : "border-border bg-muted/50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{coupon.businessName}</p>
                  <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                    {t.coupon.status[coupon.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">{coupon.couponName} · {t.coupon.benefitLabel(coupon.benefitType, coupon.benefitValue)}</p>
                {coupon.expiresAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.coupon.expiresLine(new Date(coupon.expiresAt).toLocaleDateString(bcp47))}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
