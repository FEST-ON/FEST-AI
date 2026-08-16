"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Accessibility, MapPin, Megaphone, Navigation, Store } from "lucide-react";
import {
  currentPosition,
  fetchBusinessRecommendations,
  fetchFestivalBusinesses,
  type RecommendedBusiness,
} from "@/features/business-recommendation";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { QueryState } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { useTranslation } from "@/shared/lib/i18n";

function BusinessCard({ item, sponsored, label }: { item: RecommendedBusiness; sponsored?: boolean; label: string }) {
  return (
    <article className={`rounded-xl border p-3 ${sponsored ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.category}
            {item.areaName && ` · ${item.areaName}`}
            {item.distanceMeters !== null && ` · ${item.distanceMeters}m`}
          </p>
        </div>
        {sponsored ? (
          <Badge className="shrink-0 gap-1 bg-amber-500 text-[10px] text-white hover:bg-amber-500"><Megaphone className="size-3" /> {label}</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-[10px]">{Math.round(item.score * 100)}점</Badge>
        )}
      </div>
      <ul className="mt-2 space-y-0.5">
        {item.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
            {reason}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function VisitorNearbyPage() {
  const { t, locale } = useTranslation();
  const [category, setCategory] = useState<string | undefined>();
  const accessibilityNeeded = useAccessibilityStore((state) => state.largeText);

  // 위치도 외부 상태라 쿼리로 다룬다 — 거부해도 null로 확정돼 위치 없는 추천이 그대로 나온다.
  const location = useQuery({ queryKey: ["visitor-position"], queryFn: currentPosition, staleTime: 60_000, retry: false });
  const position = location.data ?? null;
  const locating = location.isLoading;

  const recommendations = useQuery({
    queryKey: ["business-recommendations", position, category, accessibilityNeeded] as const,
    queryFn: () => fetchBusinessRecommendations({ ...position, category, accessibilityRequired: accessibilityNeeded }),
    enabled: !locating,
  });
  const businesses = useQuery({
    queryKey: ["festival-businesses", locale] as const,
    queryFn: () => fetchFestivalBusinesses(),
  });

  const categories = [...new Set((businesses.data ?? []).map((item) => item.category))];

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.nearby.title}</h1>
      <p className="text-xs text-muted-foreground">{t.nearby.subtitle}</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Navigation className={`size-4 shrink-0 ${position ? "text-primary" : "text-muted-foreground"}`} />
        <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
          {locating ? t.nearby.locating : position ? t.nearby.locationOn : t.nearby.locationOff}
        </p>
        {!position && !locating && (
          <Button size="sm" variant="outline" onClick={() => location.refetch()}>{t.nearby.retryLocation}</Button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setCategory(undefined)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === undefined ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
          >
            {t.nearby.allCategories}
          </button>
          {categories.map((value) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      <section className="mt-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Store className="size-4" /> {t.nearby.recommendedTitle}
        </h2>
        {/* 위치 확인 중에는 아직 요청 전이라 쿼리 상태로는 드러나지 않는다. */}
        {locating ? (
          <SkeletonList count={2} className="h-24 rounded-xl" />
        ) : (
          <QueryState
            query={recommendations}
            empty={t.nearby.empty}
            emptyWhen={recommendations.data?.items.length === 0}
            errorMessage={t.common.loadFailed}
            retryLabel={t.common.retry}
            skeleton={<SkeletonList count={2} className="h-24 rounded-xl" />}
          >
            {(result) => (
              <div className="space-y-2">
                {result.items.map((item) => (
                  <BusinessCard key={item.businessId} item={item} label={t.nearby.sponsoredBadge} />
                ))}
              </div>
            )}
          </QueryState>
        )}
      </section>

      {recommendations.data && recommendations.data.sponsoredItems.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Megaphone className="size-4" /> {t.nearby.sponsoredTitle}
          </h2>
          <p className="mb-2 text-[11px] text-muted-foreground">{t.nearby.sponsoredNotice}</p>
          <div className="space-y-2">
            {recommendations.data.sponsoredItems.map((item) => (
              <BusinessCard key={item.businessId} item={item} sponsored label={t.nearby.sponsoredBadge} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <MapPin className="size-4" /> {t.nearby.allBusinessTitle}
        </h2>
        <QueryState
          query={businesses}
          empty={t.common.empty}
          errorMessage={t.common.loadFailed}
          retryLabel={t.common.retry}
          skeleton={<Skeleton className="h-24 rounded-xl" />}
        >
          {(rows) => (
            <div className="space-y-2">
              {rows.map((business) => (
                <div key={business.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {business.accessibility?.wheelchair && <Accessibility className="size-3.5 text-primary" />}
                      <Badge variant="outline" className="text-[10px]">{business.category}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {business.areaName ?? t.nearby.noBooth}{business.boothNo && ` · ${business.boothNo}`}
                  </p>
                  {business.description && <p className="mt-1 text-xs text-muted-foreground">{business.description}</p>}
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </section>
    </div>
  );
}
