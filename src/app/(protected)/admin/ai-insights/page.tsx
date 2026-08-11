"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, TrendingUp, ListChecks } from "lucide-react";
import { fetchTickets } from "@/entities/ticket";
import { buildCategoryBreakdown, buildRecurringIssues, improvementTasks } from "@/features/complaint-insight/lib/analyze";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const PRIORITY_STYLE = {
  높음: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  중간: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  낮음: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
} as const;

export default function AiInsightsPage() {
  const { data: tickets, isLoading } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(true);

  const breakdown = tickets ? buildCategoryBreakdown(tickets) : [];
  const recurring = tickets ? buildRecurringIssues(tickets) : [];
  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  function rerun() {
    setAnalyzing(true);
    setAnalyzed(false);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 1100);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI 민원·후기 분류
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Perso AI 기반 자연어 분류 · 앨런(Alan) 연동 예정</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={rerun} disabled={analyzing}>
          <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
          {analyzing ? "분류 실행 중..." : "AI 재분류 실행"}
        </Button>
      </div>

      {isLoading || !tickets ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !analyzed ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border">
          <Sparkles className="size-6 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">최근 민원·후기를 분석하고 있어요...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">카테고리별 접수 현황</h2>
            </div>
            <div className="space-y-3">
              {breakdown.map((b) => (
                <div key={b.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{b.category}</span>
                    <span className="text-muted-foreground">{b.count}건</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">AI가 발견한 반복 이슈</h2>
            </div>
            {recurring.length === 0 ? (
              <p className="text-xs text-muted-foreground">현재 반복되는 이슈가 없어요.</p>
            ) : (
              <div className="space-y-3">
                {recurring.map((r) => (
                  <div key={r.tag} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{r.tag}</p>
                      <Badge variant="secondary" className="text-[10px]">{r.count}건 반복</Badge>
                    </div>
                    <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
                      {r.examples.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5">
              <ListChecks className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">AI 제안 개선 과제</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {improvementTasks.map((task) => (
                <div key={task.title} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{task.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
