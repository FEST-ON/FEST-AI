"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VisitorMenuKey = "reservation" | "stampTour" | "survey";

interface VisitorMenuSettingsState {
  reservation: boolean;
  stampTour: boolean;
  survey: boolean;
  toggleMenu: (key: VisitorMenuKey) => void;
}

export const useVisitorMenuSettingsStore = create<VisitorMenuSettingsState>()(
  persist(
    (set) => ({
      reservation: true,
      stampTour: true,
      survey: true,
      toggleMenu: (key) => set((s) => ({ [key]: !s[key] })),
    }),
    { name: "festai-visitor-menu-settings" },
  ),
);
