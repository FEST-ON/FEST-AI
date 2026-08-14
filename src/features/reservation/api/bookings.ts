import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";

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
