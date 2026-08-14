"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Leaf, Users, Scale, Sparkles, FileCheck2, CheckCircle2, CircleDashed } from "lucide-react";
import { fetchEsgMetrics, generateEsgReport } from "@/entities/esg";
import type { EsgPillar } from "@/entities/esg";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const PILLAR_META: Record<EsgPillar, { icon: typeof Leaf; tone: string }> = {
  환경: { icon: Leaf, tone: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300" },
  사회: { icon: Users, tone: "text-blue-600 bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300" },
  거버넌스: { icon: Scale, tone: "text-violet-600 bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300" },
};

const PILLARS: EsgPillar[] = ["환경", "사회", "거버넌스"];

export default function EsgPage() {
  const { data: metrics, isLoading, isError, error, refetch } = useQuery({ queryKey: ["esg-metrics"], queryFn: fetchEsgMetrics });
  const { data: report, error: reportError, isPending: reportLoading, mutate: generateReport } = useMutation({
    mutationFn: generateEsgReport,
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        다회용기·분리배출·대중교통 등 환경 데이터와 지역참여·접근성·안전 등 사회 성과를 자동 집계하고, 지표별 데이터 출처와 승인 이력을 관리해요.
      </p>

      {PILLARS.map((pillar) => {
        const { icon: Icon, tone } = PILLAR_META[pillar];
        const pillarMetrics = (metrics ?? []).filter((m) => m.pillar === pillar);
        return (
          <section key={pillar}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-full", tone)}>
                <Icon className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-foreground">{pillar} (ESG)</h2>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : isError || !metrics ? (
              <ErrorState message={queryErrorMessage(error)} onRetry={() => refetch()} />
            ) : pillarMetrics.length === 0 ? (
              <EmptyState message="집계된 지표가 없어요." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pillarMetrics.map((m) => {
                  const pct = Math.min(100, Math.round((m.value / m.target) * 100));
                  return (
                    <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-semibold text-foreground">{m.name}</p>
                        {m.approved ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="mt-2 text-xl font-extrabold text-foreground">
                        {m.value.toLocaleString()}
                        <span className="ml-0.5 text-xs font-medium text-muted-foreground">{m.unit}</span>
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        목표 {m.target.toLocaleString()}{m.unit} 대비 {pct}%
                      </p>
                      <p className="mt-2 truncate text-[10px] text-muted-foreground">출처: {m.source}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.approved ? `${m.approvedAt} 승인` : "승인 대기중"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-2">
            <FileCheck2 className="size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">ESG 보고서 초안 자동 생성</p>
              <p className="mt-0.5 text-xs text-muted-foreground">승인된 지표 데이터를 기반으로 AI가 초안을 작성해요</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => generateReport()} disabled={reportLoading}>
            <Sparkles className="size-3.5" />
            {reportLoading ? "초안 생성 중..." : "AI 초안 생성"}
          </Button>
        </div>

        {reportLoading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {reportError && <p className="mt-4 text-sm text-destructive">{reportError.message}</p>}

        {!reportLoading && report && (
          <div className="mt-4 space-y-3">
            {report.map((section) => {
              const { icon: Icon, tone } = PILLAR_META[section.pillar];
              return (
                <div key={section.pillar} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-6 items-center justify-center rounded-full", tone)}>
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm font-bold text-foreground">{section.pillar}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{section.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {section.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5 text-xs text-foreground">
                        <Badge variant="secondary" className="mt-0.5 size-1.5 shrink-0 rounded-full p-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
