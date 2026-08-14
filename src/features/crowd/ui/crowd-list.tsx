"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { CROWD_LABEL, CROWD_TONE, fetchPublicCrowd } from "@/features/crowd/api/crowd";
import { StatusPill } from "@/shared/ui/status-pill";
import { Skeleton } from "@/shared/ui/skeleton";
import { useTranslation } from "@/shared/lib/i18n";

export function CrowdList({ limit }: { limit?: number }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-crowd"],
    queryFn: fetchPublicCrowd,
    // 혼잡도는 현장 상황이라 오래 캐시하면 의미가 없다.
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;
  if (isError || !data || data.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{t.crowd.empty}</p>;
  }

  return (
    <div className="space-y-2">
      {(limit ? data.slice(0, limit) : data).map((row) => (
        <div key={row.area_id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{row.area_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.estimated_wait_min !== null ? t.crowd.waitMinutes(row.estimated_wait_min) : t.crowd.noWait}
              {row.stale && ` · ${t.crowd.stale}`}
            </p>
          </div>
          <StatusPill tone={row.stale ? "muted" : CROWD_TONE[row.crowd_level]} className="shrink-0 px-2.5 py-1 text-[11px]">
            {t.crowd.level[row.crowd_level] ?? CROWD_LABEL[row.crowd_level]}
          </StatusPill>
        </div>
      ))}
      <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <Activity className="size-3" /> {t.crowd.notice}
      </p>
    </div>
  );
}
