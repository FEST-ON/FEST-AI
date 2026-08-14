import type { Ticket, TicketPriority } from "@/entities/ticket";

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface RecurringIssue {
  tag: string;
  count: number;
  examples: string[];
}

export interface ImprovementTask {
  title: string;
  detail: string;
  priority: TicketPriority;
}

export function buildCategoryBreakdown(tickets: Ticket[]): CategoryBreakdown[] {
  const map = new Map<string, number>();
  tickets.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + 1));
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildRecurringIssues(tickets: Ticket[]): RecurringIssue[] {
  const map = new Map<string, Ticket[]>();
  tickets
    .filter((t) => t.aiTag)
    .forEach((t) => {
      const tag = t.aiTag!;
      map.set(tag, [...(map.get(tag) ?? []), t]);
    });
  return [...map.entries()].map(([tag, items]) => ({
    tag,
    count: items.length,
    examples: items.map((i) => i.title),
  }));
}

export const improvementTasks: ImprovementTask[] = [
  { title: "그늘막·휴게공간 추가 설치", detail: "메인스테이지 대기열 주변 그늘막 3개소 추가 배치 검토", priority: "높음" },
  { title: "다회용기 반납 안내 사인 보강", detail: "반납 스테이션 위치를 지도·현장 사인·AI 안내에 동시 반영", priority: "중간" },
  { title: "주차 잔여면 데이터 연동 점검", detail: "현장 센서와 앱 표시값 간 동기화 주기 단축", priority: "낮음" },
];
