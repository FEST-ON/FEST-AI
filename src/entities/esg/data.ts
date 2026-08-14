import { adminApi, adminFestivalId } from "@/shared/lib/api";
import type { EsgMetric, EsgPillar, EsgReportSection } from "./model";

export async function fetchEsgMetrics() {
  const festivalId = await adminFestivalId();
  const [metrics, measurements] = await Promise.all([
    adminApi<Array<{
      id: string; name: string; category: string;
      versions: Array<{ id: string; unit: string; target: number }>;
    }>>(`/admin/festivals/${festivalId}/esg/metrics`),
    adminApi<Array<{
      id: string; metric_version_id: string; value: number; source_type: string; source_ref?: string;
      status: string; measured_at: string; updated_at: string;
    }>>(`/admin/festivals/${festivalId}/esg/measurements`),
  ]);
  const pillars: Record<string, EsgPillar> = {
    E: "환경", ENVIRONMENT: "환경", S: "사회", SOCIAL: "사회", G: "거버넌스", GOVERNANCE: "거버넌스",
  };
  return metrics.flatMap((metric) => {
    const version = metric.versions[0];
    if (!version) return [];
    const related = measurements.filter((item) => item.metric_version_id === version.id);
    const latest = related[0];
    const value = related.filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + Number(item.value), 0);
    return [{
      id: metric.id,
      pillar: pillars[metric.category] ?? "거버넌스",
      name: metric.name,
      value,
      unit: version.unit,
      target: Number(version.target),
      source: latest ? `${latest.source_type}${latest.source_ref ? ` · ${latest.source_ref}` : ""}` : "실적 미등록",
      approved: related.some((item) => item.status === "APPROVED"),
      approvedAt: latest?.status === "APPROVED" ? latest.updated_at.slice(0, 10) : null,
      trend: related.map((item) => Number(item.value)).reverse(),
    } satisfies EsgMetric];
  });
}
export async function generateEsgReport(): Promise<EsgReportSection[]> {
  const festivalId = await adminFestivalId();
  const festival = await adminApi<{ starts_at: string; ends_at: string }>(`/admin/festivals/${festivalId}`);
  const created = await adminApi<{ reportId: string }>(`/admin/festivals/${festivalId}/esg/reports`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      title: "FESTAI ESG 성과 보고서",
      period: { from: festival.starts_at, to: festival.ends_at },
      format: "EDITABLE_DOCUMENT",
    }),
  });
  let report: { status: string; snapshot?: { metrics?: Array<{ name: string; category: string; value: number; unit: string }> } };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    report = await adminApi(`/admin/festivals/${festivalId}/esg/reports/${created.reportId}`);
    if (report.status === "DRAFT") {
      const groups = { 환경: [] as string[], 사회: [] as string[], 거버넌스: [] as string[] };
      const pillars: Record<string, EsgPillar> = {
        E: "환경", ENVIRONMENT: "환경", S: "사회", SOCIAL: "사회", G: "거버넌스", GOVERNANCE: "거버넌스",
      };
      for (const metric of report.snapshot?.metrics ?? []) {
        const pillar = pillars[metric.category] ?? "거버넌스";
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
