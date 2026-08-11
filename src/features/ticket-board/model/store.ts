"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ticket, TicketStatus } from "@/entities/ticket";
import { tickets as seedTickets } from "@/entities/ticket";

interface TicketBoardState {
  tickets: Ticket[];
  hydrated: boolean;
  hydrate: (tickets: Ticket[]) => void;
  updateStatus: (id: string, status: TicketStatus) => void;
  addTicket: (ticket: Ticket) => void;
}

export const useTicketBoardStore = create<TicketBoardState>()(
  persist(
    (set) => ({
      tickets: seedTickets,
      hydrated: true,
      hydrate: (tickets) => set((s) => (s.hydrated ? s : { tickets, hydrated: true })),
      updateStatus: (id, status) =>
        set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status } : t)) })),
      addTicket: (ticket) => set((s) => ({ tickets: [ticket, ...s.tickets] })),
    }),
    { name: "festai-tickets" },
  ),
);
