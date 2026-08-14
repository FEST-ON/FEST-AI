import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NoticeLevel = "일반" | "중요";

export interface VisitorNotice {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  /** ISO timestamp used to render a locale-aware relative time on the visitor side. */
  createdAtIso: string;
  level: NoticeLevel;
}

export interface ReservationCall {
  id: string;
  ticketNumber: number;
  program: string;
  location: string;
  createdAt: string;
  /** ISO timestamp used to render a locale-aware relative time on the visitor side. */
  createdAtIso: string;
}

interface NotificationState {
  notices: VisitorNotice[];
  reservationCalls: ReservationCall[];
  addNotice: (notice: Omit<VisitorNotice, "id" | "createdAt" | "createdAtIso">) => void;
  addReservationCall: (call: Omit<ReservationCall, "id" | "createdAt" | "createdAtIso">) => void;
  removeNotice: (id: string) => void;
  removeReservationCall: (id: string) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notices: [
        {
          id: "notice-schedule",
          title: "메인스테이지 공연 시간이 변경됐어요",
          description: "우천으로 인해 그린 콘서트 시작 시간이 19:00으로 변경됐어요.",
          createdAt: "방금 전",
          createdAtIso: new Date().toISOString(),
          level: "중요",
        },
        {
          id: "notice-safety",
          title: "우천 시 안전 이용 안내",
          description: "미끄럼 사고 예방을 위해 강변 산책로 일부 구간을 통제하고 있어요.",
          createdAt: "15분 전",
          createdAtIso: new Date(Date.now() - 15 * 60_000).toISOString(),
          level: "일반",
        },
      ],
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
      addNotice: (notice) =>
        set((state) => ({
          notices: [
            {
              ...notice,
              id: createId("notice"),
              createdAt: getCurrentTime(),
              createdAtIso: new Date().toISOString(),
            },
            ...state.notices,
          ],
        })),
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
      removeNotice: (id) =>
        set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),
      removeReservationCall: (id) =>
        set((state) => ({
          reservationCalls: state.reservationCalls.filter((call) => call.id !== id),
        })),
    }),
    { name: "festai-visitor-notifications" },
  ),
);

