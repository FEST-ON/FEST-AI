"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  MapPin,
  QrCode,
  Stamp,
  PartyPopper,
  ChevronLeft,
} from "lucide-react";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { collectStamp, fetchStampSpots, fetchPoints } from "@/entities/coupon";
import { useTranslation } from "@/shared/lib/i18n";

import { ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { NAV_ITEMS } from "@/widgets/visitor-nav/visitor-nav";
import { QrScanner } from "@/shared/ui/qr-scanner";

export default function StampTourPage() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [scanningSpot, setScanningSpot] = useState<string | null>(null);
  const [stampCode, setStampCode] = useState("");
  const stampQuery = useQuery({
    queryKey: ["stamp-spots", locale] as const,
    queryFn: () => fetchStampSpots(locale),
  });
  const points = useQuery({
    queryKey: ["visitor-points"],
    queryFn: fetchPoints,
  });
  const collectMutation = useMutation({
    mutationFn: collectStamp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stamp-spots"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-points"] });
      setScanningSpot(null);
      setStampCode("");
    },
  });

  const stampSpots = stampQuery.data ?? [];
  const total = stampSpots.length;
  const collected = stampSpots.filter((spot) => spot.collected).length;
  const complete = total > 0 && collected >= total;

  const router = useRouter();
  const pathname = usePathname();
  // 하단 탭에 없는 화면(스탬프투어·설문·상권 등)은 돌아갈 길이 브라우저 뒤로가기뿐이었다.
  const showBack = !NAV_ITEMS.some((item) => item.href === pathname);

  return (
    <>
      <div className="flex mt-2 items-center">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t.common.back}
            className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <h1 className="text-lg font-extrabold text-foreground">
          {t.stampTour.title}
        </h1>
      </div>
      <div className="px-4 pt-0 pb-6">
        <p className="text-xs text-muted-foreground">{t.stampTour.subtitle}</p>

        <section className="mt-4 rounded-2xl border border-esg/30 bg-esg/5 p-4">
          <div className="flex flex-col items-center rounded-xl border border-esg/20 bg-card py-5">
            <ProgressRing
              value={total ? (collected / total) * 100 : 0}
              label={`${collected}/${total}`}
              sublabel={t.stampTour.collectionSubLabel}
              tone="esg"
            />
            {complete && (
              <Badge className="mt-3 gap-1 bg-esg/15 text-esg-text hover:bg-esg/20">
                <PartyPopper className="size-3.5" /> {t.stampTour.completeBadge}
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-esg p-3 text-white">
            <div className="flex items-center gap-2">
              <Coins className="size-4" />
              <div>
                <p className="text-[10px] font-semibold text-white/75">
                  내 ESG 포인트
                </p>
                <p className="text-lg font-extrabold">
                  {(points.data?.balance ?? 0).toLocaleString()}P
                </p>
              </div>
            </div>
            <Link
              href="/visitor/coupons/points"
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-esg-text"
            >
              적립내역
            </Link>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Stamp className="size-4 text-esg-text" />{" "}
              {t.stampTour.spotsTitle}
            </h2>
            <span className="text-[11px] font-semibold text-esg-text">
              {collected}/{total} 완료
            </span>
          </div>

          <div className="space-y-2">
            {stampQuery.isError && (
              <ErrorState
                message={queryErrorMessage(
                  stampQuery.error,
                  t.common.loadFailed,
                )}
                retryLabel={t.common.retry}
                onRetry={() => stampQuery.refetch()}
              />
            )}
            {collectMutation.error && (
              <p className="text-xs text-destructive" role="alert">
                {queryErrorMessage(collectMutation.error)}
              </p>
            )}
            {stampSpots.map((spot) => {
              const done = spot.collected;
              const isScanning = scanningSpot === spot.id;
              return (
                <div
                  key={spot.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-esg/20 bg-card p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-esg text-white" : "bg-esg/10 text-esg-text"}`}
                    >
                      <Stamp className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {spot.name}
                      </p>
                      <p className="flex items-center gap-0.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {spot.location} · +
                        {spot.points}P
                      </p>
                    </div>
                  </div>
                  {done || spot.verificationType === "SELF" ? (
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      className={
                        done
                          ? "shrink-0 text-esg-text"
                          : "shrink-0 bg-esg text-white hover:bg-esg/90"
                      }
                      disabled={done || collectMutation.isPending}
                      onClick={() =>
                        collectMutation.mutate({
                          actionId: spot.id,
                          verificationKey: `stamp:${spot.id}`,
                        })
                      }
                    >
                      {done ? t.stampTour.doneButton : t.stampTour.stampButton}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={isScanning ? "outline" : "default"}
                      className={
                        isScanning
                          ? "shrink-0 border-esg text-esg-text"
                          : "shrink-0 bg-esg text-white hover:bg-esg/90"
                      }
                      disabled={collectMutation.isPending}
                      onClick={() => {
                        setScanningSpot(isScanning ? null : spot.id);
                        setStampCode("");
                      }}
                    >
                      <QrCode className="size-3.5" />
                      {isScanning ? t.common.cancel : t.stampTour.stampButton}
                    </Button>
                  )}
                </div>
              );
            })}

            {scanningSpot && (
              <div className="rounded-xl border border-esg/30 bg-esg/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    현장 QR로 스탬프 적립
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setScanningSpot(null)}
                  >
                    닫기
                  </Button>
                </div>
                <div className="mt-3">
                  <QrScanner
                    label={t.stampTour.scanButton}
                    onScan={(value) =>
                      collectMutation.mutate({
                        actionId: scanningSpot,
                        verificationKey: value.trim(),
                      })
                    }
                  />
                </div>
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const key = stampCode.trim();
                    if (!key) return;
                    collectMutation.mutate({
                      actionId: scanningSpot,
                      verificationKey: key,
                    });
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
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-esg text-white hover:bg-esg/90"
                      disabled={!stampCode.trim() || collectMutation.isPending}
                    >
                      {t.stampTour.stampButton}
                    </Button>
                  </div>
                </form>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t.stampTour.scanHint}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
