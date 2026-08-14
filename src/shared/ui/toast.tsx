"use client";

import { create } from "zustand";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Tone = "success" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const DISMISS_MS = 4000;

const useToastStore = create<{
  toasts: Toast[];
  push: (message: string, tone: Tone) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (message, tone) => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), DISMISS_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** React 밖(react-query mutation cache)에서도 부를 수 있도록 store를 직접 씁니다. */
export function toast(message: string, tone: Tone = "success") {
  useToastStore.getState().push(message, tone);
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    // 스크린리더도 결과를 듣도록 alert이 아닌 status로 읽어줍니다(에러는 assertive).
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-60 flex flex-col items-center gap-2 px-4">
      {toasts.map(({ id, message, tone }) => (
        <div
          key={id}
          role="status"
          aria-live={tone === "error" ? "assertive" : "polite"}
          className={cn(
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg",
            tone === "error"
              ? "border-destructive/30 bg-destructive text-white"
              : "border-border bg-card text-foreground",
          )}
        >
          {tone === "error" ? <XCircle className="mt-px size-4 shrink-0" /> : <CheckCircle2 className="mt-px size-4 shrink-0 text-emerald-600" />}
          <span className="min-w-0 flex-1">{message}</span>
          <button onClick={() => dismiss(id)} className="text-xs opacity-60 hover:opacity-100" aria-label="알림 닫기">✕</button>
        </div>
      ))}
    </div>
  );
}
