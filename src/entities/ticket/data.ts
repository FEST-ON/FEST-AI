import { currentAdmin, festivalApi, json } from "@/shared/lib/api";
import { TOPIC_LABEL, type IssueAnalysisRow } from "@/features/complaint-insight/api/issue-analysis";
import { nextTicketStatus } from "./model";
import type { NewTicket, Ticket, TicketApiStatus, TicketEvent } from "./model";
import { seoulDateTime } from "@/shared/lib/utils";

interface TicketRow {
  id: string; ticket_type: string; title: string; description: string; assignee_id?: string;
  status: TicketApiStatus; priority: string; area_id?: string; created_at: string; version: number;
}

const STATUS_LABEL = { OPEN: "접수", ASSIGNED: "배정됨", IN_PROGRESS: "처리중", RESOLVED: "해결됨", CLOSED: "완료" } as const;
const PRIORITY_LABEL = { LOW: "낮음", NORMAL: "중간", HIGH: "높음", EMERGENCY: "긴급" } as const;

export async function fetchTickets() {
  // 분류는 백엔드 issue-analysis가 담당한다(담당자 수정본 포함). 티켓 목록과 함께 읽어 붙인다.
  const [rows, analysis] = await Promise.all([
    festivalApi<TicketRow[]>(`/ops-tickets`),
    festivalApi<IssueAnalysisRow[]>(`/issue-analysis`).catch(() => [] as IssueAnalysisRow[]),
  ]);
  const byTicket = new Map(analysis.map((row) => [row.id, row.analysis]));
  return rows.map<Ticket>((row) => {
    const found = byTicket.get(row.id);
    return {
      id: row.id,
      type: row.ticket_type === "INCIDENT" ? "사고" : "민원",
      title: row.title,
      description: row.description,
      assignee: row.assignee_id ? "배정 완료" : "미배정",
      status: STATUS_LABEL[row.status],
      apiStatus: row.status,
      version: row.version,
      priority: PRIORITY_LABEL[row.priority as keyof typeof PRIORITY_LABEL] ?? "중간",
      category: found ? TOPIC_LABEL[found.topic] ?? found.topic : "미분류",
      createdAt: seoulDateTime(row.created_at),
      aiTag: found ? `${found.humanReviewed ? "담당자 확인" : "자동 분류"} · ${TOPIC_LABEL[found.topic] ?? found.topic}` : undefined,
      urgent: found?.urgent ?? row.priority === "EMERGENCY",
    };
  });
}

export async function createTicket(input: NewTicket) {
  return festivalApi(`/ops-tickets`, json("POST", input));
}

export async function fetchTicketEvents(ticketId: string) {
  return festivalApi<TicketEvent[]>(`/ops-tickets/${ticketId}/events`);
}

export async function assignTicket({ ticket, assigneeId }: { ticket: Ticket; assigneeId: string }) {
  if (ticket.version === undefined) throw new Error("최신 티켓 정보를 다시 불러와 주세요.");
  return festivalApi(`/ops-tickets/${ticket.id}`, json("PATCH", { assigneeId, version: ticket.version }));
}

export async function transitionTicket(ticket: Ticket) {
  if (ticket.apiStatus === "OPEN") {
    const admin = await currentAdmin();
    await assignTicket({ ticket, assigneeId: admin.id });
    return festivalApi(`/ops-tickets/${ticket.id}/transitions`, json("POST", { toStatus: "ASSIGNED", note: "FESTAI 운영 화면에서 담당자 배정", attachments: [] }));
  }
  const toStatus = nextTicketStatus(ticket.apiStatus);
  if (!toStatus) throw new Error("더 진행할 상태가 없습니다.");
  return festivalApi(`/ops-tickets/${ticket.id}/transitions`, json("POST", { toStatus, note: "FESTAI 운영 화면에서 상태 변경", attachments: [] }));
}
