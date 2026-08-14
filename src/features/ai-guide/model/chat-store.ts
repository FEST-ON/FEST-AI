"use client";

import { create } from "zustand";
import type { ChatMessage } from "@/entities/visitor";

export const WELCOME_MESSAGE_ID = "perso-welcome";

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  addMessage: (message: ChatMessage) => void;
  setTyping: (typing: boolean) => void;
  reset: (welcome: ChatMessage) => void;
  syncWelcome: (welcome: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTyping: (isTyping) => set({ isTyping }),
  reset: (welcome) => set({ messages: [welcome], isTyping: false }),
  syncWelcome: (welcome) =>
    set((state) => ({
      messages:
        state.messages.length === 0 ||
        (state.messages.length === 1 && state.messages[0].id === WELCOME_MESSAGE_ID)
          ? [welcome]
          : state.messages,
    })),
}));
