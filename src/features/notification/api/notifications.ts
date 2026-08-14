import { FESTIVAL_CODE, publicApi } from "@/shared/lib/api";
import { fetchVisitorBookings } from "@/features/reservation/api/bookings";

export interface PublicAnnouncement {
  id: string;
  title: string;
  severity: "INFO" | "WARNING" | "EMERGENCY";
  body: { text?: string; content?: string } | string;
  starts_at: string;
  updated_at: string;
}

export function fetchAnnouncements() {
  return publicApi<PublicAnnouncement[]>(`/public/festivals/${FESTIVAL_CODE}/announcements`);
}

export async function fetchCalledBookings() {
  return (await fetchVisitorBookings()).filter((booking) => booking.status === "CALLED");
}

export function announcementText(body: PublicAnnouncement["body"]) {
  if (typeof body === "string") return body;
  return body.text ?? body.content ?? "자세한 내용은 운영 안내를 확인해 주세요.";
}
