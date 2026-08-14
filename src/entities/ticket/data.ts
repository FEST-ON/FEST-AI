import { adminApi, adminFestivalId, currentAdmin } from "@/shared/lib/api";
import { classifyTicket, nextTicketStatus } from "./model";
import type { Ticket, TicketApiStatus } from "./model";

export async function fetchTickets() {
  const festivalId = await adminFestivalId();
  const rows = await adminApi<Array<{
    id: string; ticket_type: string; title: string; description: string; assignee_id?: string;
    status: TicketApiStatus; priority: string; area_id?: string; created_at: string; version: number;
    ai_tag?: string;
  }>>(`/admin/festivals/${festivalId}/ops-tickets`);
  const statuses = { OPEN: "접수", ASSIGNED: "배정됨", IN_PROGRESS: "처리중", RESOLVED: "해결됨", CLOSED: "완료" } as const;
  const priorities = { LOW: "낮음", NORMAL: "중간", HIGH: "높음", EMERGENCY: "높음" } as const;
  return rows.map<Ticket>((row) => {
    const type = row.ticket_type === "INCIDENT" ? "사고" : "민원";
    const category = classifyTicket(row.title, row.description, type);
    return {
      id: row.id,
      type,
      title: row.title,
      description: row.description,
      assignee: row.assignee_id ? "배정 완료" : "미배정",
      status: statuses[row.status],
      apiStatus: row.status,
      version: row.version,
      priority: priorities[row.priority as keyof typeof priorities] ?? "중간",
      category,
      createdAt: new Date(row.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      aiTag: row.ai_tag ?? `자동 분류 · ${category}`,
    };
  });
}

export async function transitionTicket(ticket: Ticket) {
  const festivalId = await adminFestivalId();
  if (ticket.apiStatus === "OPEN") {
    if (ticket.version === undefined) throw new Error("최신 티켓 정보를 다시 불러와 주세요.");
    const admin = await currentAdmin();
    await adminApi(`/admin/festivals/${festivalId}/ops-tickets/${ticket.id}`, {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: admin.id, version: ticket.version }),
    });
    return adminApi(`/admin/festivals/${festivalId}/ops-tickets/${ticket.id}/transitions`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "ASSIGNED", note: "FESTAI 운영 화면에서 담당자 배정", attachments: [] }),
    });
  }
  const toStatus = nextTicketStatus(ticket.apiStatus);
  if (!toStatus) throw new Error("더 진행할 상태가 없습니다.");
  return adminApi(`/admin/festivals/${festivalId}/ops-tickets/${ticket.id}/transitions`, {
    method: "POST",
    body: JSON.stringify({ toStatus, note: "FESTAI 운영 화면에서 상태 변경", attachments: [] }),
  });
}
