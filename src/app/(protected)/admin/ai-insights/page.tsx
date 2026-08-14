"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Flag, ListChecks, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { fetchTickets } from "@/entities/ticket";
import { buildCategoryBreakdown, buildRecurringIssues, improvementTasks } from "@/features/complaint-insight/lib/analyze";
import {
  fetchRecommendationBiasReport,
  type RecommendationExposureMetric,
  runRecommendationBiasCheck,
} from "@/features/recommendation-bias/api/recommendation-bias";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { adminApi, adminFestivalId } from "@/shared/lib/api";

interface AiReview {
  id: string;
  question: string;
  answer: string;
  reason: string;
  detail?: string;
  safety_status: string;
  model_version?: string;
  created_at: string;
}

async function fetchAiReviews() {
  const festivalId = await adminFestivalId();
  return adminApi<AiReview[]>(`/admin/festivals/${festivalId}/ai/reviews?status=OPEN`);
}

async function decideAiReview({ id, decision }: { id: string; decision: string }) {
  const festivalId = await adminFestivalId();
  return adminApi(`/admin/festivals/${festivalId}/ai/reviews/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

const PRIORITY_STYLE: Record<string, string> = {
  높음: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  중간: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  낮음: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ExposureList({ title, items }: { title: string; items: RecommendationExposureMetric[] }) {
  const visibleItems = items.slice(0, 5);

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px]">
          상위 {visibleItems.length}개
        </Badge>
      </div>
      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">최근 집계할 추천 노출이 없습니다.</p>
        ) : (
          visibleItems.map((item) => (
            <div key={`${title}-${item.key}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-foreground">{item.label}</span>
                <span className={cn("tabular-nums", item.exceeded ? "font-bold text-red-600" : "text-muted-foreground")}>
                  {percent(item.exposure_ratio)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", item.exceeded ? "bg-red-500" : "bg-primary")}
                  style={{ width: `${Math.min(item.exposure_ratio * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.exposure_count}회 노출 / 기준 {percent(item.threshold)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AiInsightsPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(true);
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const { data: reviews = [], isLoading: reviewsLoading, error: reviewsError } = useQuery({ queryKey: ["ai-reviews"], queryFn: fetchAiReviews });
  const reviewMutation = useMutation({
    mutationFn: decideAiReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-reviews"] }),
  });

  const breakdown = tickets ? buildCategoryBreakdown(tickets) : [];
  const recurring = tickets ? buildRecurringIssues(tickets) : [];
  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  const biasQuery = useQuery({
    queryKey: ["recommendation-bias"],
    queryFn: () => fetchRecommendationBiasReport(),
    retry: 1,
  });

  const biasMutation = useMutation({
    mutationFn: runRecommendationBiasCheck,
    onSuccess: (report) => {
      queryClient.setQueryData(["recommendation-bias"], report);
    },
  });

  const biasReport = biasMutation.data ?? biasQuery.data;
  const hasBiasViolation = Boolean(biasReport?.violations.length);
  const exposureSummary = useMemo(() => {
    if (!biasReport) return "추천 이벤트 수집 후 주간 편향 점검 결과가 표시됩니다.";
    return `일반 ${biasReport.total_regular_exposures}회 / 후원 ${biasReport.total_sponsored_exposures}회 노출`;
  }, [biasReport]);

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
            AI 민원·추천 인사이트
          </p>
          <p className="mt-1 text-xs text-muted-foreground">민원 분류와 업체 추천 노출 편향을 함께 점검합니다.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={rerun} disabled={analyzing}>
          <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
          {analyzing ? "분석 실행 중..." : "AI 재분석 실행"}
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">AI 답변 안전 검토 큐</h2>
              <p className="text-xs text-muted-foreground">방문객이 신고한 답변을 원문과 함께 검토해요.</p>
            </div>
          </div>
          <Badge variant={reviews.length > 0 ? "destructive" : "secondary"}>{reviews.length}건 대기</Badge>
        </div>

        {reviewsLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : reviewsError ? (
          <p className="text-sm text-destructive">{reviewsError.message}</p>
        ) : reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">검토 대기 중인 AI 답변이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="destructive" className="gap-1"><Flag className="size-3" /> 사용자 신고</Badge>
                  <span>{review.safety_status}</span>
                  {review.model_version && <span>모델 {review.model_version}</span>}
                  <span>{new Date(review.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">질문</p>
                <p className="mt-1 text-sm text-foreground">{review.question}</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">AI 답변</p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm text-foreground">{review.answer}</p>
                <p className="mt-2 text-xs text-muted-foreground">신고 사유: {review.detail || review.reason}</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: review.id, decision: "ANSWER_VALID" })}>정상 답변</Button>
                  <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: review.id, decision: "CONTENT_FIX_REQUIRED" })}>콘텐츠 보완</Button>
                  <Button size="sm" variant="destructive" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: review.id, decision: "SAFETY_POLICY_UPDATE" })}>차단 규칙 보완</Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {reviewMutation.error && <p className="mt-3 text-sm text-destructive">{reviewMutation.error.message}</p>}
      </section>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">추천 편향 점검</h2>
              <p className="text-xs text-muted-foreground">{exposureSummary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {biasReport && (
              <Badge variant={hasBiasViolation ? "destructive" : "secondary"}>
                {hasBiasViolation ? "기준 초과" : "정상 범위"}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => biasMutation.mutate()} disabled={biasMutation.isPending}>
              <RefreshCw className={cn("size-3.5", biasMutation.isPending && "animate-spin")} />
              즉시 점검
            </Button>
          </div>
        </div>

        {biasQuery.isError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            백엔드 추천 편향 API에 연결할 수 없습니다. `NEXT_PUBLIC_API_BASE_URL`과 서버 상태를 확인하세요.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">점검 주기</p>
              <p className="mt-1 text-lg font-bold text-foreground">Weekly</p>
              <p className="mt-1 text-[11px] text-muted-foreground">다음 권장 점검 {formatDateTime(biasReport?.next_recommended_check_at)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">수집 이벤트</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.total_events ?? 0}건</p>
              <p className="mt-1 text-[11px] text-muted-foreground">최근 7일 기준</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">일반 추천 노출</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.total_regular_exposures ?? 0}회</p>
              <p className="mt-1 text-[11px] text-muted-foreground">업체 60% / 카테고리 75%</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">후원 추천 노출</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.total_sponsored_exposures ?? 0}회</p>
              <p className="mt-1 text-[11px] text-muted-foreground">일반 추천과 분리 집계</p>
            </div>
          </div>
        )}

        {biasReport && (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ExposureList title="일반 추천 업체별 노출" items={biasReport.business_exposures} />
            <ExposureList title="일반 추천 카테고리별 노출" items={biasReport.category_exposures} />
            <ExposureList title="후원 추천 업체별 노출" items={biasReport.sponsored_business_exposures} />
            <ExposureList title="후원 추천 카테고리별 노출" items={biasReport.sponsored_category_exposures} />
          </div>
        )}
      </div>

      {isLoading || !tickets ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !analyzed ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border">
          <Sparkles className="size-6 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">최근 민원·후기 데이터를 분석하고 있습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
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
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">반복 이슈</h2>
            </div>
            {recurring.length === 0 ? (
              <p className="text-xs text-muted-foreground">현재 반복되는 이슈가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {recurring.map((r) => (
                  <div key={r.tag} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{r.tag}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.count}건 반복
                      </Badge>
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

          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5">
              <ListChecks className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">AI 제안 개선 과제</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {improvementTasks.map((task) => (
                <div key={task.title} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE["낮음"]}`}>
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
