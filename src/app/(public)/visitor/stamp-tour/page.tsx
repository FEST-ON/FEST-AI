"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Stamp, MapPin, Coins, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { collectStamp, fetchStampSpots, fetchPoints } from "@/entities/coupon";
import { useTranslation } from "@/shared/lib/i18n";
import { ErrorState, queryErrorMessage } from "@/shared/ui/query-state";

export default function StampTourPage() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const { data: stampSpots = [], error: spotsError, refetch: refetchSpots } = useQuery({
    queryKey: ["stamp-spots", locale] as const,
    queryFn: () => fetchStampSpots(locale),
  });
  const collectMutation = useMutation({
    mutationFn: collectStamp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stamp-spots"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-points"] });
    },
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
                <Button
                  size="sm"
                  variant={done ? "secondary" : "default"}
                  disabled={done || collectMutation.isPending}
                  onClick={() => collectMutation.mutate(spot.id)}
                >
                  {done ? t.stampTour.doneButton : t.stampTour.stampButton}
                </Button>
              </div>
            );
          })}
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
                <span className="shrink-0 font-bold text-primary">+{entry.points_delta}P</span>
              </li>
            ))}
            {(points?.ledger.length ?? 0) === 0 && (
              <li className="text-center text-xs text-muted-foreground">{t.stampTour.pointsEmpty}</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
