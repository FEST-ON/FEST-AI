import { festivalApi, json } from "@/shared/lib/api";

export const ISSUE_TOPICS = ["SAFETY", "CROWD", "FACILITY", "GUIDANCE", "OTHER"] as const;
export const ISSUE_SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export type IssueTopic = (typeof ISSUE_TOPICS)[number];
export type IssueSentiment = (typeof ISSUE_SENTIMENTS)[number];

export const TOPIC_LABEL: Record<string, string> = {
  SAFETY: "안전·사고",
  CROWD: "혼잡·대기",
  FACILITY: "편의시설",
  GUIDANCE: "안내·동선",
  OTHER: "기타",
};

export const SENTIMENT_LABEL: Record<string, string> = {
  POSITIVE: "긍정",
  NEUTRAL: "중립",
  NEGATIVE: "부정",
};

// 반복 이슈로 승격하는 최소 건수. 1건짜리를 "반복"이라 부르면 신호가 죽는다.
const RECURRING_MIN = 2;

export interface IssueAnalysisRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  updatedAt: string | null;
  analysis: {
    topic: IssueTopic;
    sentiment: IssueSentiment;
    urgent: boolean;
    humanReviewed: boolean;
    note: string | null;
  };
}

export async function fetchIssueAnalysis() {
  return festivalApi<IssueAnalysisRow[]>(`/issue-analysis`);
}

/** 페이지 헤더의 새로고침과 분석 패널이 같은 키를 쓰므로 두 곳에서 불러도 요청은 한 번이다. */
export const issueAnalysisQuery = { queryKey: ["issue-analysis"], queryFn: fetchIssueAnalysis };

export interface IssueOverride {
  ticketId: string;
  topic: IssueTopic;
  sentiment: IssueSentiment;
  urgent: boolean;
  note?: string | null;
}

export async function overrideIssueAnalysis({ ticketId, ...body }: IssueOverride) {
  return festivalApi(`/issue-analysis/${ticketId}`, json("PATCH", body));
}

export interface TopicBreakdown {
  topic: IssueTopic;
  label: string;
  count: number;
  urgent: number;
  negative: number;
}

export function buildTopicBreakdown(rows: IssueAnalysisRow[]): TopicBreakdown[] {
  const map = new Map<IssueTopic, TopicBreakdown>();
  for (const row of rows) {
    const { topic, urgent, sentiment } = row.analysis;
    const entry = map.get(topic) ?? { topic, label: TOPIC_LABEL[topic] ?? topic, count: 0, urgent: 0, negative: 0 };
    entry.count += 1;
    if (urgent) entry.urgent += 1;
    if (sentiment === "NEGATIVE") entry.negative += 1;
    map.set(topic, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export interface RecurringIssue {
  topic: IssueTopic;
  label: string;
  count: number;
  examples: string[];
}

export function buildRecurringIssues(rows: IssueAnalysisRow[]): RecurringIssue[] {
  return buildTopicBreakdown(rows)
    .filter((entry) => entry.count >= RECURRING_MIN)
    .map((entry) => ({
      topic: entry.topic,
      label: entry.label,
      count: entry.count,
      examples: rows.filter((row) => row.analysis.topic === entry.topic).slice(0, 3).map((row) => row.title),
    }));
}

export interface ImprovementTask {
  title: string;
  detail: string;
  priority: "높음" | "중간" | "낮음";
}

// 주제별 권장 조치는 백엔드 RISK_ACTIONS와 같은 성격의 운영 규칙이다 — 근거 건수는 실제 티켓에서 나온다.
const TOPIC_ACTION: Record<string, string> = {
  SAFETY: "안전 인력 추가 배치와 위험 구간 점검을 우선 처리해 주세요.",
  CROWD: "대기 동선을 분산하고 혼잡 구역에 우회 안내를 게시해 주세요.",
  FACILITY: "해당 편의시설의 정비·증설 여부를 현장 확인해 주세요.",
  GUIDANCE: "안내 표지와 AI 안내 문구에 위치 정보를 보강해 주세요.",
  OTHER: "담당자를 지정해 개별 확인 후 분류를 수정해 주세요.",
};

export function buildImprovementTasks(rows: IssueAnalysisRow[]): ImprovementTask[] {
  const open = rows.filter((row) => row.status !== "RESOLVED" && row.status !== "CLOSED");
  return buildTopicBreakdown(open)
    .slice(0, 3)
    .map((entry) => ({
      title: `${entry.label} 개선 조치`,
      detail: `미해결 ${entry.count}건(긴급 ${entry.urgent}건). ${TOPIC_ACTION[entry.topic] ?? TOPIC_ACTION.OTHER}`,
      priority: entry.urgent > 0 ? "높음" : entry.count >= RECURRING_MIN ? "중간" : "낮음",
    }));
}
