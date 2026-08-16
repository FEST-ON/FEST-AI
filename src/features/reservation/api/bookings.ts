import { FESTIVAL_CODE, festivalApi, json, publicApi, visitorApi } from "@/shared/lib/api";

export interface VisitorBooking {
  id: string;
  status: "CONFIRMED" | "WAITING" | "CALLED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  party_size: number;
  queue_number: number | null;
  called_at: string | null;
  starts_at: string;
  ends_at: string;
  program_title: string;
  program_slug: string;
  area_name: string;
}

export interface BookableSession {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  status: string;
  areaName: string;
}

interface PublicProgram {
  title: string;
  slug: string;
  sessions: Array<{ id: string; startsAt: string; endsAt: string; capacity: number | null; status: string; area?: { name?: string } }>;
}

export function fetchVisitorBookings() { return visitorApi<VisitorBooking[]>("/visitor/bookings"); }

export async function fetchBookableSessions(): Promise<BookableSession[]> {
  const programs = await publicApi<PublicProgram[]>(`/public/festivals/${FESTIVAL_CODE}/programs`);
  return programs.flatMap((program) => program.sessions
    .filter((session) => session.status === "OPEN")
    .map((session) => ({
      id: session.id, title: program.title, slug: program.slug, startsAt: session.startsAt,
      endsAt: session.endsAt, capacity: session.capacity, status: session.status, areaName: session.area?.name ?? "장소 미정",
    })));
}

export function createBooking(sessionId: string) {
  return visitorApi<VisitorBooking>(`/visitor/program-sessions/${sessionId}/bookings`, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ partySize: 1 }),
  });
}

export function cancelBooking(bookingId: string) {
  return visitorApi<void>(`/visitor/bookings/${bookingId}`, { method: "DELETE" });
}

export interface AdminBooking {
  id: string;
  status: VisitorBooking["status"];
  party_size: number;
  queue_number: number | null;
  called_at: string | null;
  starts_at: string;
  program_title: string;
}

export async function fetchAdminBookings(status?: VisitorBooking["status"]) {
  return festivalApi<AdminBooking[]>(`/bookings${status ? `?status=${status}` : ""}`);
}

export type BookingAction = "CALLED" | "NO_SHOW" | "COMPLETED";

const ACTION_NOTE: Record<BookingAction, string> = {
  CALLED: "FESTAI 운영 화면에서 호출",
  NO_SHOW: "호출 후 미방문 처리",
  COMPLETED: "이용 완료 처리",
};

// note를 주면 감사 로그에 그대로 남는다(예: "호출 후 15분 경과, 현장 미도착").
export async function updateBookingStatus({ bookingId, status, note }: { bookingId: string; status: BookingAction; note?: string }) {
  return festivalApi(`/bookings/${bookingId}/status`, json("POST", { status, note: note ?? ACTION_NOTE[status] }));
}

// 대기(WAITING) 예약만 호출할 수 있다 — 확정(CONFIRMED) 예약은 자리가 이미 보장돼 호출 대상이 아니다.
export function callBooking(bookingId: string) {
  return updateBookingStatus({ bookingId, status: "CALLED" });
}
