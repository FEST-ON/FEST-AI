import type { Tone } from "@/shared/ui/status-pill";

// 백엔드 ops_tickets.ticket_type은 COMPLAINT/INCIDENT 둘뿐이다. 공지는 announcements가 따로 관리한다.
export type TicketType = "민원" | "사고";
export type TicketStatus = "접수" | "배정됨" | "처리중" | "해결됨" | "완료";
export type TicketApiStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "긴급" | "높음" | "중간" | "낮음";

export const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  긴급: "critical",
  높음: "danger",
  중간: "warning",
  낮음: "neutral",
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
  urgent?: boolean;
}

export interface NewTicket {
  ticketType: "COMPLAINT" | "INCIDENT";
  title: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "EMERGENCY";
  areaId?: string;
}

export interface TicketEvent {
  id: string;
  from_status: TicketApiStatus | null;
  to_status: TicketApiStatus;
  note: string | null;
  created_at: string;
}

export function nextTicketStatus(status: TicketApiStatus) {
  const next: Partial<Record<TicketApiStatus, TicketApiStatus>> = {
    OPEN: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "CLOSED",
  };
  return next[status];
}

/** 버튼에는 현재 상태가 아니라 누르면 무슨 일이 벌어지는지를 쓴다. */
export const TICKET_ACTION_LABEL: Record<TicketApiStatus, string> = {
  OPEN: "내게 배정",
  ASSIGNED: "처리 시작",
  IN_PROGRESS: "해결 처리",
  RESOLVED: "완료 처리",
  CLOSED: "완료됨",
};
