"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Search, Sparkles } from "lucide-react";
import { fetchFestivalBrief } from "@/features/festival-brief/api/festival-brief";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

export function FestivalBriefCard() {
  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ["festival-ai-brief"], queryFn: fetchFestivalBrief });

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 via-card to-violet-50 p-5 dark:border-blue-900 dark:from-blue-950/50 dark:via-card dark:to-violet-950/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-primary"><span className="grid size-8 place-items-center rounded-full bg-primary/10"><Sparkles className="size-4" /></span><div><h2 className="text-sm font-bold text-foreground">Alan ESG 한줄 브리핑</h2><p className="text-[10px] text-muted-foreground">DB의 ESG 운영 지표를 검색해 우선 조치가 필요한 내용을 요약</p></div></div>
          {isLoading || !data ? <Skeleton className="mt-4 h-14 w-full rounded-xl" /> : (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertTriangle className="size-4" />
                <div><p className="text-[10px] font-semibold">{data.metric_label}</p><p className="text-lg font-extrabold">{data.metric_value}</p></div>
              </div>
              <blockquote className="text-base font-bold leading-7 text-foreground">“{data.summary}”</blockquote>
            </div>
          )}
          {data && <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Search className="size-3" />근거 {data.sources.length}개</span><span>·</span><span>{new Date(data.generated_at).toLocaleString("ko-KR")} 기준</span>{data.sources.map((source) => <span key={source} className="rounded-full bg-background/70 px-2 py-1">{source}</span>)}</div>}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "animate-spin" : ""} />새로고침</Button>
      </div>
    </section>
  );
}
