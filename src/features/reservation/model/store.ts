"use client";

import { create } from "zustand";
import type { WaitTicket } from "@/entities/visitor";
import { WAIT_TICKETS_SEED } from "@/entities/visitor";

interface ReservationState {
  tickets: WaitTicket[];
  issueTicket: (program: string) => void;
  cancelTicket: (id: string) => void;
}

let ticketSeq = 200;

export const useReservationStore = create<ReservationState>((set) => ({
  tickets: WAIT_TICKETS_SEED,
  issueTicket: (program) =>
    set((s) => ({
      tickets: [
        ...s.tickets,
        {
          id: `w-${Date.now()}`,
          program,
          number: ticketSeq++,
          peopleAhead: Math.floor(Math.random() * 10) + 3,
          estimatedWaitMinutes: Math.floor(Math.random() * 20) + 5,
          status: "대기중",
        },
      ],
    })),
  cancelTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) })),
}));
