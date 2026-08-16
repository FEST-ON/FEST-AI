"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Leaf, Users, Scale, Sparkles, FileCheck2, CheckCircle2, CircleDashed, Download, Paperclip } from "lucide-react";
import { fetchEsgMetrics, generateEsgReport } from "@/entities/esg";
import type { EsgPillar } from "@/entities/esg";
import {
  addEvidence,
  approveReport,
  createMeasurement,
  exportReport,
  fetchEsgDashboard,
  fetchExportJob,
  fetchMeasurements,
  fetchMetricVersions,
  fetchReports,
  MEASUREMENT_STATUS_LABEL,
  reviewMeasurement,
  type NewMeasurement,
} from "@/features/esg-admin";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmButton } from "@/shared/ui/confirm-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Meter } from "@/shared/ui/meter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { StatusPill, type Tone } from "@/shared/ui/status-pill";
import { useForm } from "@/shared/lib/use-form";
import { cn, datetimeLocal, seoulDate, seoulDateTime } from "@/shared/lib/utils";
import { artifactOf, downloadArtifact, formatBytes } from "@/shared/lib/download-artifact";

const PILLAR_META: Record<EsgPillar, { icon: typeof Leaf; tone: string }> = {
  환경: { icon: Leaf, tone: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300" },
  사회: { icon: Users, tone: "text-primary bg-primary/10 dark:bg-primary/25 dark:text-primary-tint" },
  거버넌스: { icon: Scale, tone: "text-foreground bg-muted dark:bg-muted dark:text-foreground" },
};

const PILLARS: EsgPillar[] = ["환경", "사회", "거버넌스"];

/** 데이터 품질 경고를 한 번에 펼쳐 보여줄 최대 건수. */
const WARNING_PREVIEW = 5;

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: "success", REJECTED: "danger", DRAFT: "neutral", IN_REVIEW: "warning", SUPERSEDED: "muted",
};

function emptyMeasurement(): NewMeasurement {
  return { metricVersionId: "", value: 0, sourceType: "MANUAL", sourceRef: "", measuredAt: datetimeLocal(new Date()) };
}

export default function EsgPage() {
  const queryClient = useQueryClient();
  const { form, set, field, setForm, reset } = useForm<NewMeasurement>(emptyMeasurement);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const { form: evidence, field: evidenceField, reset: resetEvidence } = useForm({ fileId: "", fileHash: "", evidenceType: "PHOTO" });

  const metrics = useQuery({ queryKey: ["esg-metrics"], queryFn: fetchEsgMetrics });
  const versions = useQuery({ queryKey: ["esg-metric-versions"], queryFn: fetchMetricVersions });
  const measurements = useQuery({ queryKey: ["esg-measurements"], queryFn: () => fetchMeasurements() });
  const reports = useQuery({ queryKey: ["esg-reports"], queryFn: fetchReports });
  // 데이터 품질 경고와 외부 AI 브리핑은 서버가 계속 내려주고 있었는데 화면이 버리고 있었다.
  const dashboard = useQuery({ queryKey: ["esg-dashboard"], queryFn: fetchEsgDashboard });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["esg-measurements"] });
    queryClient.invalidateQueries({ queryKey: ["esg-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["festival-ai-brief"] });
  };

  const submitMeasurement = useMutation({
    mutationFn: createMeasurement,
    meta: { success: "실적을 등록했어요." },
    onSuccess: () => { invalidate(); reset(); setCorrecting(null); },
  });
  const review = useMutation({
    mutationFn: reviewMeasurement,
    meta: { success: "검수 결과를 반영했어요." },
    onSuccess: invalidate,
  });
  const attach = useMutation({
    mutationFn: addEvidence,
    meta: { success: "증빙을 등록했어요." },
    onSuccess: () => { invalidate(); setEvidenceFor(null); resetEvidence(); },
  });

  const refreshReports = () => queryClient.invalidateQueries({ queryKey: ["esg-reports"] });
  const generate = useMutation({ mutationFn: generateEsgReport, meta: { success: "리포트를 생성했어요." }, onSuccess: refreshReports });
  const approve = useMutation({ mutationFn: approveReport, meta: { success: "리포트를 승인했어요." }, onSuccess: refreshReports });
  const exportJob = useMutation({ mutationFn: exportReport, meta: { success: "내보내기를 시작했어요." }, onSuccess: refreshReports });
  // 잡 워커가 파일을 만들 때까지 기다린다 — 예전에는 jobId만 찍고 끝나서 산출물을 받을 길이 없었다.
  const exportedJob = useQuery({
    queryKey: ["esg-export-job", exportJob.data?.jobId],
    queryFn: () => fetchExportJob(exportJob.data!.jobId),
    enabled: Boolean(exportJob.data?.jobId),
    refetchInterval: (query) => (query.state.data?.status === "COMPLETED" || query.state.data?.status === "FAILED" ? false : 2000),
  });
  const reportArtifact = artifactOf(exportedJob.data?.result);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        환경·사회·거버넌스 실적을 등록하고 검수자가 승인해요. 승인된 실적만 성과 집계와 보고서에 반영되고, 승인 후에는 수정 대신 정정 실적으로 대체합니다.
      </p>

      {/* 서버가 계속 내려주던 데이터 품질 경고. 화면이 버리고 있어서 미승인·미등록 지표가 드러나지 않았다. */}
      {(dashboard.data?.dataQualityWarnings.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> 데이터 품질 경고
          </h2>
          <ul className="mt-2 space-y-1">
            {/* 지표가 많은 축제에서 경고가 수십 줄로 늘어지면 오히려 안 읽힌다. 앞부분만 펼친다. */}
            {dashboard.data?.dataQualityWarnings.slice(0, WARNING_PREVIEW).map((warning) => {
              const metric = dashboard.data?.metrics.find((row) => row.id === warning.metricId);
              return (
                <li key={warning.metricId} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{metric?.name ?? warning.metricId}</span>
                  {warning.type === "MISSING_DATA"
                    ? " · 승인된 실적이 없어 집계에 반영되지 않아요."
                    : ` · 승인 대기 실적 ${warning.count}건이 집계에서 빠져 있어요.`}
                </li>
              );
            })}
            {(dashboard.data?.dataQualityWarnings.length ?? 0) > WARNING_PREVIEW && (
              <li className="text-xs font-semibold text-muted-foreground">
                외 {(dashboard.data?.dataQualityWarnings.length ?? 0) - WARNING_PREVIEW}건 — 아래 실적 목록에서 확인하세요.
              </li>
            )}
          </ul>
        </section>
      )}

      {/* 외부 AI가 실제로 쓰였을 때만 AI 브리핑으로 표시한다 — 규칙 문장을 AI라고 부르지 않는다. */}
      {dashboard.data?.aiBrief && dashboard.data.externalAiUsed && (
        <p className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          {dashboard.data.aiBrief}
        </p>
      )}

      {PILLARS.map((pillar) => {
        const { icon: Icon, tone } = PILLAR_META[pillar];
        const pillarMetrics = (metrics.data ?? []).filter((metric) => metric.pillar === pillar);
        return (
          <section key={pillar}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-full", tone)}><Icon className="size-4" /></span>
              <h2 className="text-sm font-bold text-foreground">{pillar} (ESG)</h2>
            </div>
            <QueryState query={metrics} empty="집계된 지표가 없어요." emptyWhen={pillarMetrics.length === 0} skeleton={
                <SkeletonList count={4} className="h-32 rounded-2xl" wrapperClassName="grid grid-cols-1 gap-3 space-y-0 sm:grid-cols-2 lg:grid-cols-4" />
              }>
              {() => (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {pillarMetrics.map((metric) => {
                    const pct = metric.target ? Math.min(100, Math.round((metric.value / metric.target) * 100)) : 0;
                    return (
                      <div key={metric.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-semibold text-foreground">{metric.name}</p>
                          {metric.approved ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> : <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" />}
                        </div>
                        <p className="mt-2 text-xl font-extrabold text-foreground">
                          {metric.value.toLocaleString()}
                          <span className="ml-0.5 text-xs font-medium text-muted-foreground">{metric.unit}</span>
                        </p>
                        <Meter percent={pct} className="mt-2 h-1.5" />
                        <p className="mt-1 text-[10px] text-muted-foreground">목표 {metric.target.toLocaleString()}{metric.unit} 대비 {pct}%</p>
                        <p className="mt-2 truncate text-[10px] text-muted-foreground">출처: {metric.source}</p>
                        <p className="text-[10px] text-muted-foreground">{metric.approved ? `${metric.approvedAt} 승인` : "승인 대기중"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </QueryState>
          </section>
        );
      })}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">{correcting ? "실적 정정 등록" : "실적 등록"}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {correcting
            ? "승인된 실적은 직접 수정할 수 없어요. 원본을 참조하는 정정 실적을 새로 등록하면 승인 시 원본이 대체됩니다."
            : "측정값과 데이터 출처를 남기면 검수자가 승인 여부를 결정해요."}
        </p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitMeasurement.mutate({
              ...form,
              sourceRef: form.sourceRef || undefined,
              measuredAt: new Date(form.measuredAt).toISOString(),
              supersedesId: correcting ?? undefined,
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>지표</Label>
            <Select value={form.metricVersionId} onValueChange={(value) => set("metricVersionId")(String(value ?? ""))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="지표 선택" /></SelectTrigger>
              <SelectContent>
                {(versions.data ?? []).map((version) => <SelectItem key={version.id} value={version.id}>{version.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="measurement-value">측정값</Label>
            <Input id="measurement-value" type="number" step="any" value={form.value} onChange={(event) => set("value")(Number(event.target.value))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="source-type">출처 유형</Label>
            <Input id="source-type" {...field("sourceType")} required placeholder="MANUAL" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="measured-at">측정 시각</Label>
            <Input id="measured-at" type="datetime-local" {...field("measuredAt")} required />
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="source-ref">출처 상세(선택)</Label>
            <Input id="source-ref" {...field("sourceRef")} placeholder="예: 다회용기 반납 스테이션 집계표" />
          </div>
          <div className="sm:col-span-5 flex items-center justify-end gap-3">
            {submitMeasurement.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(submitMeasurement.error)}</p>}
            {correcting && <Button type="button" variant="outline" size="sm" onClick={() => setCorrecting(null)}>정정 취소</Button>}
            <Button type="submit" size="sm" disabled={!form.metricVersionId || submitMeasurement.isPending}>
              {submitMeasurement.isPending ? "등록 중..." : correcting ? "정정 실적 등록" : "실적 등록"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold text-foreground">실적 승인 이력</h2>
        <QueryState query={measurements} empty="등록된 실적이 없어요." skeleton={<Skeleton className="h-32 w-full rounded-xl" />}>
          {(rows) => (
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">{row.metricName}</p>
                        <StatusPill tone={STATUS_TONE[row.status] ?? "neutral"}>
                          {MEASUREMENT_STATUS_LABEL[row.status] ?? row.status}
                        </StatusPill>
                        {row.supersedesId && <Badge variant="outline" className="text-[10px]">정정</Badge>}
                        <Badge variant="outline" className="gap-1 text-[10px]"><Paperclip className="size-3" /> 증빙 {row.evidenceCount}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {Number(row.value).toLocaleString()}{row.unit} · {row.sourceType}
                        {row.sourceRef && ` · ${row.sourceRef}`}
                        {" · "}{seoulDateTime(row.measuredAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.status !== "APPROVED" && row.status !== "SUPERSEDED" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEvidenceFor(evidenceFor === row.id ? null : row.id)}>증빙</Button>
                          <ConfirmButton
                            size="sm"
                            disabled={review.isPending && review.variables?.measurementId === row.id}
                            title="실적을 승인할까요?"
                            description={`${row.metricName} ${Number(row.value).toLocaleString()}${row.unit}이(가) ESG 리포트 집계에 반영됩니다. 승인 후에는 정정으로만 바꿀 수 있어요.`}
                            confirmLabel="승인"
                            onConfirm={() => review.mutate({ measurementId: row.id, decision: "APPROVED" })}
                          >
                            승인
                          </ConfirmButton>
                          <ConfirmButton
                            size="sm"
                            variant="destructive"
                            disabled={review.isPending && review.variables?.measurementId === row.id}
                            title="실적을 반려할까요?"
                            description={`${row.metricName} · 증빙 ${row.evidenceCount}건. 사유는 제출자에게 그대로 전달됩니다.`}
                            confirmLabel="반려"
                            reason={{ label: "반려 사유", placeholder: "예: 반납 스테이션 집계표가 측정 시각과 맞지 않아요." }}
                            onConfirm={(comment) => review.mutate({ measurementId: row.id, decision: "REJECTED", comment })}
                          >
                            반려
                          </ConfirmButton>
                        </>
                      )}
                      {row.status === "APPROVED" && (
                        <Button size="sm" variant="outline" onClick={() => { setCorrecting(row.id); setForm({ ...emptyMeasurement(), metricVersionId: row.metricVersionId }); }}>
                          정정
                        </Button>
                      )}
                    </div>
                  </div>

                  {evidenceFor === row.id && (
                    <form
                      className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-4"
                      onSubmit={(event) => { event.preventDefault(); attach.mutate({ measurementId: row.id, ...evidence }); }}
                    >
                      <Input placeholder="파일 ID" {...evidenceField("fileId")} required />
                      <Input placeholder="파일 해시" {...evidenceField("fileHash")} required />
                      <Input placeholder="증빙 유형" {...evidenceField("evidenceType")} required />
                      <Button type="submit" size="sm" disabled={attach.isPending}>증빙 연결</Button>
                      <p className="sm:col-span-4 text-[10px] text-muted-foreground">
                        파일 저장소가 확정되지 않아 외부에 업로드된 파일의 ID와 해시를 연결합니다.
                      </p>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </QueryState>
        {(review.error || attach.error) && <p className="mt-3 text-sm text-destructive">{queryErrorMessage(review.error ?? attach.error)}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-2">
            <FileCheck2 className="size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">ESG 보고서</p>
              <p className="mt-0.5 text-xs text-muted-foreground">승인된 실적 스냅샷으로 초안을 만들고, 승인 후 내보내요.</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Sparkles className="size-3.5" />
            {generate.isPending ? "초안 생성 중..." : "보고서 초안 생성"}
          </Button>
        </div>

        {generate.error && <p className="mt-4 text-sm text-destructive">{queryErrorMessage(generate.error)}</p>}

        {generate.data && (
          <div className="mt-4 space-y-3">
            {generate.data.map((section) => {
              const { icon: Icon, tone } = PILLAR_META[section.pillar];
              return (
                <div key={section.pillar} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-6 items-center justify-center rounded-full", tone)}><Icon className="size-3.5" /></span>
                    <p className="text-sm font-bold text-foreground">{section.pillar}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{section.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {section.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-1.5 text-xs text-foreground">
                        <Badge variant="secondary" className="mt-0.5 size-1.5 shrink-0 rounded-full p-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <QueryState query={reports} empty="생성된 보고서가 없습니다." skeleton={<Skeleton className="h-20 w-full rounded-xl" />}>
            {(rows) => rows.map((report) => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{report.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {seoulDate(report.periodFrom)} ~ {seoulDate(report.periodTo)} · {report.format}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === "APPROVED" || report.status === "EXPORTED" ? "secondary" : "outline"} className="text-[10px]">
                    {report.status}
                  </Badge>
                  {report.status === "DRAFT" && (
                    <Button size="sm" disabled={approve.isPending && approve.variables === report.id} onClick={() => approve.mutate(report.id)}>보고서 승인</Button>
                  )}
                  {/* 백엔드 PDF는 표준 14폰트(Latin-1)로만 그려서 한글이 깨진다. DOCX는 본문이 UTF-8 XML이라 정확히 나온다. */}
                  {report.status === "APPROVED" && (
                    <>
                      <Button size="sm" variant="outline" disabled={exportJob.isPending && exportJob.variables?.reportId === report.id} onClick={() => exportJob.mutate({ reportId: report.id, format: "DOCX" })}>
                        <Download className="size-3.5" /> DOCX 내보내기
                      </Button>
                      <Button size="sm" variant="ghost" title="PDF는 한글이 '?'로 깨집니다" disabled={exportJob.isPending && exportJob.variables?.reportId === report.id} onClick={() => exportJob.mutate({ reportId: report.id, format: "PDF" })}>
                        PDF(라틴 문자만)
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </QueryState>
          {(approve.error || exportJob.error) && <p className="text-sm text-destructive">{queryErrorMessage(approve.error ?? exportJob.error)}</p>}
          {exportJob.data && (
            <div className="space-y-1.5 rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">
                내보내기 작업 {exportJob.data.jobId.slice(0, 8)}… · {exportedJob.data?.status ?? exportJob.data.status}
              </p>
              {exportedJob.data?.status === "FAILED" && (
                <p className="text-xs text-destructive">파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.</p>
              )}
              {reportArtifact && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => downloadArtifact(reportArtifact)}>
                    <Download className="size-3.5" /> {reportArtifact.fileName} 내려받기 ({formatBytes(reportArtifact.byteSize)})
                  </Button>
                  {reportArtifact.textLossWarning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400" role="alert">{reportArtifact.textLossWarning}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
