export type TicketType = "공지" | "민원" | "사고";
export type TicketStatus = "접수" | "배정됨" | "처리중" | "해결됨" | "완료";
export type TicketApiStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "높음" | "중간" | "낮음";

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  assignee: string;
  status: TicketStatus;
  apiStatus: TicketApiStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  aiTag?: string;
}
