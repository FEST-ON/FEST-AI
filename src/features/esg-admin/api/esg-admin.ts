import { festivalApi, json } from "@/shared/lib/api";

export const MEASUREMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "작성 중",
  IN_REVIEW: "검토 중",
  APPROVED: "승인",
  REJECTED: "반려",
  SUPERSEDED: "정정됨",
};

export interface Measurement {
  id: string;
  metric_version_id: string;
  metric_name: string;
  category: string;
  unit: string;
  value: number;
  source_type: string;
  source_ref: string | null;
  status: string;
  measured_at: string;
  supersedes_id: string | null;
  evidence_count: number;
}

export async function fetchMeasurements(status?: string) {
  return festivalApi<Measurement[]>(`/esg/measurements${status ? `?status=${status}` : ""}`);
}

export interface NewMeasurement {
  metricVersionId: string;
  value: number;
  sourceType: string;
  sourceRef?: string;
  measuredAt: string;
  /** 정정할 때만 채운다 — 승인된 실적은 수정 대신 새 실적이 원본을 대체한다. */
  supersedesId?: string;
}

export async function createMeasurement(input: NewMeasurement) {
  return festivalApi(`/esg/measurements`, {
    method: "POST",
    // 같은 지표·같은 근거를 두 번 올리면 서버가 중복으로 막는다.
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ ...input, dedupeKey: `${input.metricVersionId}:${input.measuredAt}:${input.value}` }),
  });
}

export async function reviewMeasurement({ measurementId, decision, comment }: { measurementId: string; decision: "APPROVED" | "REJECTED"; comment?: string }) {
  return festivalApi(`/esg/measurements/${measurementId}/reviews`, json("POST", { decision, comment }));
}

export interface NewEvidence {
  measurementId: string;
  fileId: string;
  fileHash: string;
  evidenceType: string;
}

/** 파일 저장소가 확정되지 않아 백엔드는 외부 fileId와 해시만 연결한다. */
export async function addEvidence({ measurementId, ...body }: NewEvidence) {
  return festivalApi(`/esg/measurements/${measurementId}/evidence`, json("POST", body));
}

export interface EsgReport {
  id: string;
  title: string;
  status: "GENERATING" | "DRAFT" | "APPROVED" | "EXPORTED" | "FAILED";
  format: string;
  period_from: string;
  period_to: string;
  created_at: string;
  snapshot?: { metrics?: Array<{ name: string; category: string; value: number; unit: string }> } | null;
}

export async function fetchReports() {
  return festivalApi<EsgReport[]>(`/esg/reports`);
}

export async function approveReport(reportId: string) {
  return festivalApi(`/esg/reports/${reportId}/approve`, { method: "POST" });
}

export async function exportReport({ reportId, format }: { reportId: string; format: "PDF" | "DOCX" }) {
  return festivalApi<{ jobId: string; status: string }>(`/esg/reports/${reportId}/exports`, json("POST", { format }));
}

export interface MetricVersionOption {
  id: string;
  label: string;
  unit: string;
}

/** 실적 입력용 지표 버전 목록 — 지표마다 최신 버전 하나만 쓴다. */
export async function fetchMetricVersions(): Promise<MetricVersionOption[]> {
  const metrics = await festivalApi<Array<{
    id: string; name: string; category: string;
    versions: Array<{ id: string; unit: string; version_no: number }>;
  }>>(`/esg/metrics`);
  return metrics.flatMap((metric) => {
    const version = metric.versions[0];
    return version ? [{ id: version.id, label: `${metric.name} (${metric.category})`, unit: version.unit }] : [];
  });
}
