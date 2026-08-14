import { festivalApi } from "@/shared/lib/api";

export interface RiskSignal {
  type: string;
  value: number;
  threshold: number | null;
  source_updated_at: string | null;
}

export interface FestivalBrief {
  summary: string;
  alan_comment?: string;
  metric_label: string;
  metric_value: string;
  status: "normal" | "warning" | "critical";
  sources: string[];
  generated_at: string;
  reasons: string[];
  recommended_actions: string[];
  evidence: RiskSignal[];
}

interface RiskBriefResponse {
  risk_level: "NORMAL" | "WARNING" | "CRITICAL" | "INSUFFICIENT_DATA";
  risk_score: number;
  evidence: RiskSignal[];
  summary: string;
  reasons: string[];
  recommended_actions: string[];
  external_ai_used: boolean;
  source_updated_at: string | null;
  policy_version: string;
}

const SIGNAL_LABEL: Record<string, string> = {
  crowding: "혼잡 구역 비율",
  unresolved_safety_complaints: "미해결 중요 민원",
  safety_incidents: "안전 사고",
  staffing_gap: "인력 미배치 구역",
  schedule_change: "최근 일정 변경",
};

// 위험 점수를 만든 신호 중 임계값을 가장 크게 넘은 것이 카드에 띄울 값이다.
function worstSignal(evidence: RiskSignal[]) {
  return [...evidence].sort((a, b) => (b.value - (b.threshold ?? 0)) - (a.value - (a.threshold ?? 0)))[0];
}

export async function fetchFestivalBrief(): Promise<FestivalBrief> {
  const brief = await festivalApi<RiskBriefResponse>(`/risk-brief`, { cache: "no-store" });
  const worst = worstSignal(brief.evidence ?? []);
  return {
    summary: brief.summary,
    // 외부 AI가 실제로 쓰였을 때만 Alan 한줄평으로 표시한다 — 규칙 문장을 AI라고 부르지 않는다.
    alan_comment: brief.external_ai_used ? brief.summary : undefined,
    metric_label: worst ? SIGNAL_LABEL[worst.type] ?? worst.type : "위험 점수",
    metric_value: worst
      ? `${worst.value}${worst.threshold === null ? "" : ` / 기준 ${worst.threshold}`}`
      : `${brief.risk_score}점`,
    status: brief.risk_level === "CRITICAL" ? "critical" : brief.risk_level === "WARNING" ? "warning" : "normal",
    sources: ["혼잡 스냅샷", "운영 티켓", "인력 배치", "프로그램 일정"],
    generated_at: brief.source_updated_at ?? new Date().toISOString(),
    reasons: brief.reasons ?? [],
    recommended_actions: brief.recommended_actions ?? [],
    evidence: brief.evidence ?? [],
  };
}
