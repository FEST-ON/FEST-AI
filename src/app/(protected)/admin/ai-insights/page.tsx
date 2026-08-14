"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Flag, ListChecks, RefreshCw, Scale, ShieldCheck, Sparkles, TrendingUp, UserCheck } from "lucide-react";
import { PRIORITY_TONE } from "@/entities/ticket";
import {
  buildImprovementTasks,
  buildRecurringIssues,
  buildTopicBreakdown,
  fetchIssueAnalysis,
  ISSUE_SENTIMENTS,
  ISSUE_TOPICS,
  overrideIssueAnalysis,
  SENTIMENT_LABEL,
  TOPIC_LABEL,
  type IssueAnalysisRow,
  type IssueSentiment,
  type IssueTopic,
} from "@/features/complaint-insight/api/issue-analysis";
import { fetchRecommendationBiasReport } from "@/features/recommendation-bias/api/recommendation-bias";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { cn, seoulDateTime } from "@/shared/lib/utils";
import { festivalApi, json } from "@/shared/lib/api";

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
  return festivalApi<AiReview[]>(`/ai/reviews?status=OPEN`);
}

async function decideAiReview({ id, decision }: { id: string; decision: string }) {
  return festivalApi(`/ai/reviews/${id}/decision`, json("POST", { decision }));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

interface ExposureRow {
  key: string;
  label: string;
  total: number;
  sponsored?: number;
  share: number;
  exceeded: boolean;
}

function ExposureList({ title, items, threshold }: { title: string; items: ExposureRow[]; threshold: number }) {
  const visibleItems = items.slice(0, 5);

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px]">기준 {percent(threshold)}</Badge>
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
                  {percent(item.share)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", item.exceeded ? "bg-red-500" : "bg-primary")}
                  style={{ width: `${Math.min(item.share * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.total}회 노출{item.sponsored !== undefined && ` · 광고 ${item.sponsored}회`}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OverrideRow({ row, onSave, saving }: {
  row: IssueAnalysisRow;
  onSave: (value: { topic: IssueTopic; sentiment: IssueSentiment; urgent: boolean }) => void;
  saving: boolean;
}) {
  const [topic, setTopic] = useState<IssueTopic>(row.analysis.topic);
  const [sentiment, setSentiment] = useState<IssueSentiment>(row.analysis.sentiment);
  const [urgent, setUrgent] = useState(row.analysis.urgent);
  const dirty = topic !== row.analysis.topic || sentiment !== row.analysis.sentiment || urgent !== row.analysis.urgent;

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="mr-auto min-w-0 truncate text-sm font-semibold text-foreground">{row.title}</p>
        {row.analysis.humanReviewed ? (
          <Badge variant="secondary" className="gap-1 text-[10px]"><UserCheck className="size-3" /> 담당자 수정</Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px]"><Sparkles className="size-3" /> 자동 분류</Badge>
        )}
        {row.analysis.urgent && <Badge variant="destructive" className="text-[10px]">긴급</Badge>}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Select value={topic} onValueChange={(value) => setTopic(value as IssueTopic)}>
          <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ISSUE_TOPICS.map((value) => <SelectItem key={value} value={value}>{TOPIC_LABEL[value]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sentiment} onValueChange={(value) => setSentiment(value as IssueSentiment)}>
          <SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ISSUE_SENTIMENTS.map((value) => <SelectItem key={value} value={value}>{SENTIMENT_LABEL[value]}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="size-3.5 accent-red-600" />
          긴급
        </label>
        <Button size="sm" variant="outline" className="ml-auto" disabled={!dirty || saving} onClick={() => onSave({ topic, sentiment, urgent })}>
          분류 저장
        </Button>
      </div>
    </div>
  );
}

type Tab = "safety" | "issues" | "bias";

export default function AiInsightsPage() {
  const queryClient = useQueryClient();
  // 세 가지 서로 다른 업무(답변 검수·민원 분석·추천 편향)가 한 스크롤에 쌓여 있던 자리.
  const [tab, setTab] = useState<Tab>("safety");
  const [overrideLimit, setOverrideLimit] = useState(20);

  const issues = useQuery({ queryKey: ["issue-analysis"], queryFn: fetchIssueAnalysis });
  const { data: reviews = [], isLoading: reviewsLoading, error: reviewsError } = useQuery({ queryKey: ["ai-reviews"], queryFn: fetchAiReviews });
  const reviewMutation = useMutation({
    mutationFn: decideAiReview,
    meta: { success: "검수 결과를 반영했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-reviews"] }),
  });
  const overrideMutation = useMutation({
    mutationFn: overrideIssueAnalysis,
    meta: { success: "분류를 수정했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issue-analysis"] }),
  });

  const rows = useMemo(() => issues.data ?? [], [issues.data]);
  const breakdown = useMemo(() => buildTopicBreakdown(rows), [rows]);
  const recurring = useMemo(() => buildRecurringIssues(rows), [rows]);
  const improvementTasks = useMemo(() => buildImprovementTasks(rows), [rows]);
  const maxCount = Math.max(...breakdown.map((entry) => entry.count), 1);

  const biasQuery = useQuery({
    queryKey: ["recommendation-bias"],
    queryFn: () => fetchRecommendationBiasReport(),
    retry: 1,
  });

  const biasReport = biasQuery.data;
  const hasBiasViolation = biasReport?.status === "WARNING";
  const businessRows = (biasReport?.business_exposures ?? []).map((row) => ({
    key: row.business_id,
    label: row.name,
    total: row.total_exposures,
    sponsored: row.sponsored_exposures,
    share: row.exposure_share,
    exceeded: row.is_over_threshold,
  }));
  const categoryRows = (biasReport?.category_exposures ?? []).map((row) => ({
    key: row.category,
    label: row.category,
    total: row.total_exposures,
    share: row.exposure_share,
    exceeded: row.is_over_threshold,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI 민원·추천 인사이트
          </p>
          <p className="mt-1 text-xs text-muted-foreground">백엔드 민원 분류 결과와 업체 추천 노출 편향을 함께 점검합니다.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => issues.refetch()} disabled={issues.isFetching}>
          <RefreshCw className={cn("size-3.5", issues.isFetching && "animate-spin")} />
          {issues.isFetching ? "불러오는 중..." : "새로고침"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="safety" className="gap-1.5">
            안전 검수
            {reviews.length > 0 && <Badge variant="destructive" className="text-[10px]">{reviews.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="issues">민원 분석</TabsTrigger>
          <TabsTrigger value="bias" className="gap-1.5">
            추천 편향
            {hasBiasViolation && <Badge variant="destructive" className="text-[10px]">초과</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section hidden={tab !== "safety"} className="rounded-2xl border border-border bg-card p-5">
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
                  <span>{seoulDateTime(review.created_at)}</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">질문</p>
                <p className="mt-1 text-sm text-foreground">{review.question}</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">AI 답변</p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm text-foreground">{review.answer}</p>
                <p className="mt-2 text-xs text-muted-foreground">신고 사유: {review.detail || review.reason}</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={reviewMutation.isPending && reviewMutation.variables?.id === review.id} onClick={() => reviewMutation.mutate({ id: review.id, decision: "ANSWER_VALID" })}>정상 답변</Button>
                  <Button size="sm" variant="outline" disabled={reviewMutation.isPending && reviewMutation.variables?.id === review.id} onClick={() => reviewMutation.mutate({ id: review.id, decision: "CONTENT_FIX_REQUIRED" })}>콘텐츠 보완</Button>
                  <Button size="sm" variant="destructive" disabled={reviewMutation.isPending && reviewMutation.variables?.id === review.id} onClick={() => reviewMutation.mutate({ id: review.id, decision: "SAFETY_POLICY_UPDATE" })}>차단 규칙 보완</Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {reviewMutation.error && <p className="mt-3 text-sm text-destructive">{reviewMutation.error.message}</p>}
      </section>

      <div hidden={tab !== "bias"} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">추천 편향 점검</h2>
              <p className="text-xs text-muted-foreground">
                {biasReport?.summary ?? "추천 이벤트 수집 후 편향 점검 결과가 표시됩니다."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {biasReport && (
              <Badge variant={hasBiasViolation ? "destructive" : "secondary"}>
                {hasBiasViolation ? "기준 초과" : biasReport.status === "PASS" ? "정상 범위" : "데이터 부족"}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => biasQuery.refetch()} disabled={biasQuery.isFetching}>
              <RefreshCw className={cn("size-3.5", biasQuery.isFetching && "animate-spin")} />
              즉시 점검
            </Button>
          </div>
        </div>

        {biasQuery.isError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            추천 편향 API에 연결할 수 없습니다. {queryErrorMessage(biasQuery.error)}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">점검 구간</p>
              <p className="mt-1 text-lg font-bold text-foreground">최근 {biasReport?.window_days ?? 7}일</p>
              <p className="mt-1 text-[11px] text-muted-foreground">노출 이력 보존 기간 내</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">수집 이벤트</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.checked_event_count ?? 0}건</p>
              <p className="mt-1 text-[11px] text-muted-foreground">방문객 추천 요청 수</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">전체 노출</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.total_exposures ?? 0}회</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                업체 {percent(biasReport?.thresholds.max_business_exposure_share ?? 0.6)} / 업종 {percent(biasReport?.thresholds.max_category_exposure_share ?? 0.75)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">광고 노출</p>
              <p className="mt-1 text-lg font-bold text-foreground">{biasReport?.sponsored_exposures ?? 0}회</p>
              <p className="mt-1 text-[11px] text-muted-foreground">일반 추천과 분리 집계</p>
            </div>
          </div>
        )}

        {biasReport && (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ExposureList title="업체별 노출" items={businessRows} threshold={biasReport.thresholds.max_business_exposure_share} />
              <ExposureList title="업종별 노출" items={categoryRows} threshold={biasReport.thresholds.max_category_exposure_share} />
            </div>
            <ul className="mt-3 space-y-1">
              {biasReport.recommended_actions.map((action) => (
                <li key={action} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {action}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {tab !== "issues" ? null : issues.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : issues.isError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{issues.error.message}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">주제별 접수 현황</h2>
            </div>
            {breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">분석할 민원·사고 티켓이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {breakdown.map((entry) => (
                  <div key={entry.topic}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{entry.label}</span>
                      <span className="text-muted-foreground">{entry.count}건{entry.urgent > 0 && ` · 긴급 ${entry.urgent}`}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", entry.urgent > 0 ? "bg-red-500" : "bg-primary")} style={{ width: `${(entry.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                {recurring.map((issue) => (
                  <div key={issue.topic} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{issue.label}</p>
                      <Badge variant="secondary" className="text-[10px]">{issue.count}건 반복</Badge>
                    </div>
                    <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
                      {issue.examples.map((example) => <li key={example}>{example}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5">
              <ListChecks className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">권장 개선 과제</h2>
              <span className="text-[11px] text-muted-foreground">미해결 티켓 분류 기준</span>
            </div>
            {improvementTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">미해결 민원·사고가 없어 제안할 과제가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {improvementTasks.map((task) => (
                  <div key={task.title} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <StatusPill tone={PRIORITY_TONE[task.priority]} className="shrink-0">
                        {task.priority}
                      </StatusPill>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{task.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5">
              <UserCheck className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">분류 검토·수정</h2>
              <span className="text-[11px] text-muted-foreground">자동 분류가 틀렸다면 담당자가 직접 고칠 수 있어요.</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">분류할 티켓이 없습니다.</p>
            ) : (
              <>
                <div className="space-y-2.5">
                  {rows.slice(0, overrideLimit).map((row) => (
                    <OverrideRow
                      key={`${row.id}-${row.updated_at ?? "auto"}`}
                      row={row}
                      saving={overrideMutation.isPending}
                      onSave={(value) => overrideMutation.mutate({ ticketId: row.id, ...value })}
                    />
                  ))}
                </div>
                {rows.length > overrideLimit && (
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setOverrideLimit((value) => value + 20)}>
                      더 보기
                    </Button>
                    <p className="text-[11px] text-muted-foreground">전체 {rows.length}건 중 {overrideLimit}건 표시 중</p>
                  </div>
                )}
              </>
            )}
            {overrideMutation.error && <p className="mt-3 text-sm text-destructive">{overrideMutation.error.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
