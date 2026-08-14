import { adminApi, adminFestivalId } from "@/shared/lib/api";

export interface FestivalBrief {
  summary: string;
  allen_comment?: string;
  metric_label: string;
  metric_value: string;
  status: "normal" | "warning" | "critical";
  sources: string[];
  generated_at: string;
}

// ponytail: 백엔드가 allen/alan 표기를 섞어 내려줘서 키만 흡수한다.
type FestivalBriefPayload = Partial<FestivalBrief> & {
  alan_comment?: string;
  allenComment?: string;
  one_line_comment?: string;
};

function normalizeFestivalBrief(payload: FestivalBriefPayload): FestivalBrief {
  if (!payload.summary || !payload.metric_label || !payload.metric_value || !payload.generated_at) {
    throw new Error("Festival brief API returned incomplete data.");
  }

  return {
    summary: payload.summary,
    allen_comment:
      payload.allen_comment ??
      payload.alan_comment ??
      payload.allenComment ??
      payload.one_line_comment,
    metric_label: payload.metric_label,
    metric_value: payload.metric_value,
    status: payload.status ?? "normal",
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    generated_at: payload.generated_at,
  };
}

export async function fetchFestivalBrief(options: { refresh?: boolean } = {}): Promise<FestivalBrief> {
  const festivalId = await adminFestivalId();
  const searchParams = new URLSearchParams({ focus: "esg" });
  if (options.refresh) searchParams.set("refresh", "true");
  const payload = await adminApi<FestivalBriefPayload | { data: FestivalBriefPayload }>(
    `/admin/festivals/${festivalId}/ai-brief?${searchParams.toString()}`,
    { cache: "no-store" },
  );
  return normalizeFestivalBrief("data" in payload ? payload.data : payload);
}
