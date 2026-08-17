"use client";

import { useEffect, useState } from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { Toaster, toast } from "@/shared/ui/toast";
import { queryErrorMessage } from "@/shared/ui/query-state";
import { mutationToast, type MutationToastMeta } from "@/shared/lib/mutation-toast";

/**
 * 관리자 콘솔의 쓰기 동작은 화면이 그대로라 성공했는지 알 수 없어 중복 실행이 잦았다.
 * 화면마다 성공 문구를 넣는 대신 mutation cache에서 한 번에 처리한다.
 * 문구는 useMutation의 meta.success로 넘기고, 알림이 방해가 되는 곳은 meta.silent를 쓴다.
 */
function notify(outcome: "success" | "error", meta: MutationToastMeta | undefined, error?: unknown) {
  const result = mutationToast(outcome, meta, location.pathname, queryErrorMessage(error, "처리하지 못했어요."));
  if (result) toast(result.message, result.tone);
}

const mutationCache = new MutationCache({
  onSuccess: (_data, _variables, _context, mutation) => notify("success", mutation.meta as MutationToastMeta | undefined),
  onError: (error, _variables, _context, mutation) => notify("error", mutation.meta as MutationToastMeta | undefined, error),
});

export function Providers({ children }: { children: React.ReactNode }) {
  const largeText = useAccessibilityStore((state) => state.largeText);
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache,
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    document.documentElement.dataset.largeText = String(largeText);
  }, [largeText]);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
  }, [highContrast]);

  // 첫 페인트는 layout.tsx의 인라인 스크립트가 맞춰 두고, 여기서는 이후의 시스템 설정 변경만 따라간다.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

