import { festivalApi, festivalApiAll } from "@/shared/lib/api";

export type EsgPillar = "환경" | "사회" | "거버넌스";

export interface EsgMetric {
  id: string;
  pillar: EsgPillar;
  name: string;
  value: number;
  unit: string;
  target: number;
  source: string;
  approved: boolean;
  approvedAt: string | null;
  trend: number[];
}

export interface EsgReportSection {
  pillar: EsgPillar;
  summary: string;
  highlights: string[];
}

/** 백엔드는 E/S/G 약어를, 화면은 한글 축을 쓴다. 예전 데이터의 전체 이름도 함께 받는다. */
const PILLAR_BY_CATEGORY: Record<string, EsgPillar> = {
  E: "환경", ENVIRONMENT: "환경", S: "사회", SOCIAL: "사회", G: "거버넌스", GOVERNANCE: "거버넌스",
};

export async function fetchEsgMetrics() {
  const [metrics, measurements] = await Promise.all([
    festivalApi<Array<{
      id: string; name: string; category: string;
      versions: Array<{ id: string; unit: string; target: number }>;
    }>>(`/esg/metrics`),
    festivalApiAll<{
      id: string; metricVersionId: string; value: number; sourceType: string; sourceRef?: string;
      status: string; measuredAt: string; updatedAt: string;
    }>(`/esg/measurements`),
  ]);
  return metrics.flatMap((metric) => {
    // versions는 최신 버전이 앞에 온다. 정의(단위·목표)는 최신 버전을 쓰되, 실적은 지표의
    // 모든 버전에서 모은다 — 예전에는 최신 버전 실적만 세어서, 지표 버전을 새로 만드는
    // 순간 이전 버전으로 승인된 실적이 화면에서 통째로 사라졌다(보고서 값과도 어긋났다).
    const version = metric.versions[0];
    if (!version) return [];
    const versionIds = new Set(metric.versions.map((row) => row.id));
    const related = measurements.filter((item) => versionIds.has(item.metricVersionId));
    const latest = related[0];
    const value = related.filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + Number(item.value), 0);
    return [{
      id: metric.id,
      pillar: PILLAR_BY_CATEGORY[metric.category] ?? "거버넌스",
      name: metric.name,
      value,
      unit: version.unit,
      target: Number(version.target),
      source: latest ? `${latest.sourceType}${latest.sourceRef ? ` · ${latest.sourceRef}` : ""}` : "실적 미등록",
      approved: related.some((item) => item.status === "APPROVED"),
      approvedAt: latest?.status === "APPROVED" ? latest.updatedAt.slice(0, 10) : null,
      trend: related.map((item) => Number(item.value)).reverse(),
    } satisfies EsgMetric];
  });
}
export async function generateEsgReport(): Promise<EsgReportSection[]> {
  const festival = await festivalApi<{ startsAt: string; endsAt: string }>();
  const created = await festivalApi<{ reportId: string }>(`/esg/reports`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      title: "FESTAI ESG 성과 보고서",
      period: { from: festival.startsAt, to: festival.endsAt },
      format: "EDITABLE_DOCUMENT",
    }),
  });
  let report: { status: string; snapshot?: { metrics?: Array<{ name: string; category: string; value: number; unit: string }> } };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    report = await festivalApi(`/esg/reports/${created.reportId}`);
    if (report.status === "DRAFT") {
      const groups = { 환경: [] as string[], 사회: [] as string[], 거버넌스: [] as string[] };
      for (const metric of report.snapshot?.metrics ?? []) {
        const pillar = PILLAR_BY_CATEGORY[metric.category] ?? "거버넌스";
        groups[pillar].push(`${metric.name} ${metric.value ?? 0}${metric.unit}`);
      }
      return (Object.keys(groups) as EsgPillar[]).map((pillar) => ({
        pillar,
        summary: groups[pillar].length ? `승인된 ${pillar} 지표를 기준으로 집계한 성과입니다.` : `승인된 ${pillar} 지표가 아직 없습니다.`,
        highlights: groups[pillar],
      }));
    }
    if (report.status === "FAILED") throw new Error("ESG 보고서 생성에 실패했습니다.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("ESG 보고서 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
}
