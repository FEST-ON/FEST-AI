"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccessibilityStore } from "@/features/accessibility/model/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const largeText = useAccessibilityStore((state) => state.largeText);
  const [queryClient] = useState(
    () =>
      new QueryClient({
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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

