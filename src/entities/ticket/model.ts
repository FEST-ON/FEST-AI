export type TicketType = "공지" | "민원" | "사고";
export type TicketStatus = "접수" | "배정됨" | "처리중" | "해결됨" | "완료";
export type TicketApiStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "높음" | "중간" | "낮음";

export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  높음: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  중간: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  낮음: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  assignee: string;
  status: TicketStatus;
  apiStatus: TicketApiStatus;
  version?: number;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  aiTag?: string;
}

export function classifyTicket(title: string, description: string, type: TicketType) {
  const text = `${title} ${description}`;
  if (/(사고|안전|낙상|미끄|응급)/.test(text) || type === "사고") return "안전·사고";
  if (/(주차|교통|셔틀|버스)/.test(text)) return "교통";
  if (/(다회용기|분리배출|친환경|ESG)/i.test(text)) return "ESG운영";
  if (/(그늘|화장실|수유|편의|대기)/.test(text)) return "편의시설";
  if (/(일정|공연|프로그램)/.test(text)) return "일정";
  return "기타";
}

export function nextTicketStatus(status: TicketApiStatus) {
  const next: Partial<Record<TicketApiStatus, TicketApiStatus>> = {
    OPEN: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "CLOSED",
  };
  return next[status];
}
