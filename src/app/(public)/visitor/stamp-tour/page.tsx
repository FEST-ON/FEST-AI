"use client";

import { useQuery } from "@tanstack/react-query";
import { Stamp, MapPin, Ticket, PartyPopper } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { fetchStampSpots, fetchLocalCoupons } from "@/entities/coupon";
import { useStampTourStore } from "@/features/stamp-tour/model/store";
import { useTranslation } from "@/shared/lib/i18n";

export default function StampTourPage() {
  const { t, locale } = useTranslation();
  const { collectedIds, collect } = useStampTourStore();
  const { data: stampSpots = [] } = useQuery({
    queryKey: ["stamp-spots", locale] as const,
    queryFn: () => fetchStampSpots(locale),
  });
  const { data: localCoupons = [] } = useQuery({
    queryKey: ["local-coupons", locale] as const,
    queryFn: () => fetchLocalCoupons(locale),
  });
  const total = stampSpots.length;
  const collected = collectedIds.length;
  const complete = collected >= total;

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.stampTour.title}</h1>
      <p className="text-xs text-muted-foreground">{t.stampTour.subtitle}</p>

      <div className="mt-4 flex flex-col items-center rounded-2xl border border-border bg-card py-6">
        <ProgressRing value={(collected / total) * 100} label={`${collected}/${total}`} sublabel={t.stampTour.collectionSubLabel} />
        {complete && (
          <Badge className="mt-3 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
            <PartyPopper className="size-3.5" /> {t.stampTour.completeBadge}
          </Badge>
        )}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-foreground">{t.stampTour.spotsTitle}</h2>
        <div className="space-y-2">
          {stampSpots.map((spot) => {
            const done = collectedIds.includes(spot.id);
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
                <Button size="sm" variant={done ? "secondary" : "default"} disabled={done} onClick={() => collect(spot.id)}>
                  {done ? t.stampTour.doneButton : t.stampTour.stampButton}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Ticket className="size-4" /> {t.stampTour.couponsTitle}
        </h2>
        <div className="space-y-2">
          {localCoupons.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 ${c.used ? "border-border bg-muted/50 opacity-60" : "border-primary/30 bg-blue-50 dark:bg-blue-950/20"}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{c.store}</p>
                <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-primary">{c.discount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.stampTour.expiresLine(c.location, c.expiresAt)}</p>
              {c.used && <p className="mt-1 text-[11px] font-medium text-muted-foreground">{t.stampTour.usedLabel}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
