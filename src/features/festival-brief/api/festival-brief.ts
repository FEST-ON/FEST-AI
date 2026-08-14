import { adminApi, adminFestivalId } from "@/shared/lib/api";

export interface FestivalBrief {
  summary: string;
  metric_label: string;
  metric_value: string;
  status: "normal" | "warning" | "critical";
  sources: string[];
  generated_at: string;
}

export async function fetchFestivalBrief(): Promise<FestivalBrief> {
  const festivalId = await adminFestivalId();
  const result = await adminApi<{ answer: string; sources: Array<{ title: string }> }>(`/admin/festivals/${festivalId}/ai/operations/search`, {
    method: "POST",
    body: JSON.stringify({ question: "현재 축제의 ESG 운영 자료에서 우선 확인해야 할 문제를 근거와 함께 한 문장으로 알려줘" }),
  });
  return {
    summary: result.answer,
    metric_label: "ESG 운영 점검",
    metric_value: "AI 검색",
    status: result.sources.length ? "warning" : "normal",
    sources: result.sources.map((source) => source.title),
    generated_at: new Date().toISOString(),
  };
}
