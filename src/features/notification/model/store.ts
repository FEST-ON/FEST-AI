import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ReservationCall {
  id: string;
  ticketNumber: number;
  program: string;
  location: string;
  createdAt: string;
  /** ISO timestamp used to render a locale-aware relative time on the visitor side. */
  createdAtIso: string;
}

// 공지는 서버가 관리한다(entities/announcement). 여기 남은 건 아직 API가 없는 예약 호출뿐.
interface NotificationState {
  reservationCalls: ReservationCall[];
  addReservationCall: (call: Omit<ReservationCall, "id" | "createdAt" | "createdAtIso">) => void;
  removeReservationCall: (id: string) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      reservationCalls: [
        {
          id: "reservation-call-45",
          ticketNumber: 45,
          program: "드론라이트쇼 명당석",
          location: "예약 프로그램 입구",
          createdAt: "지금 호출됨",
          createdAtIso: new Date().toISOString(),
        },
      ],
      addReservationCall: (call) =>
        set((state) => ({
          reservationCalls: [
            {
              ...call,
              id: createId("reservation-call"),
              createdAt: "지금 호출됨",
              createdAtIso: new Date().toISOString(),
            },
            ...state.reservationCalls,
          ],
        })),
      removeReservationCall: (id) =>
        set((state) => ({
          reservationCalls: state.reservationCalls.filter((call) => call.id !== id),
        })),
    }),
    { name: "festai-visitor-notifications" },
  ),
);

