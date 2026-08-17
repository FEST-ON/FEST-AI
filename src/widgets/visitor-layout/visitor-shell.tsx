"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { setVisitorArea } from "@/features/visitor-area/api/area";
import { EmergencyAnnouncementBanner } from "@/features/notification/ui/emergency-announcement-banner";
import { useTranslation } from "@/shared/lib/i18n";
import { cn } from "@/shared/lib/utils";
import { VisitorNav } from "@/widgets/visitor-nav/visitor-nav";
import { VisitorTopbar } from "@/widgets/visitor-nav/visitor-topbar";

const KIOSK_ROUTES = ["/visitor", "/visitor/ai-guide", "/visitor/map"];

export function VisitorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const { bcp47 } = useTranslation();
  const isImmersiveAiGuide = pathname === "/visitor/ai-guide";
  const isKioskRoute = KIOSK_ROUTES.some((route) =>
    route === "/visitor" ? pathname === route : pathname.startsWith(route),
  );

  useEffect(() => {
    if (visitorMode === "kiosk" && !isKioskRoute) {
      router.replace("/visitor");
    }
  }, [isKioskRoute, router, visitorMode]);

  // VIS-12: 진입 QR에 실린 구역을 자동 설정한다. useSearchParams 대신 location을 읽어
  // 레이아웃 전체가 Suspense 경계를 요구하지 않게 한다(위치정보는 쓰지 않는다).
  useEffect(() => {
    const areaId = new URLSearchParams(window.location.search).get("area");
    if (!areaId) return;
    void setVisitorArea(areaId, "QR")
      .then(() => queryClient.invalidateQueries({ queryKey: ["visitor-area"] }))
      .catch(() => undefined);
  }, [pathname, queryClient]);

  useEffect(() => {
    document.documentElement.lang = bcp47;
    return () => {
      document.documentElement.lang = "ko";
    };
  }, [bcp47]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <EmergencyAnnouncementBanner />
      {!isImmersiveAiGuide && <VisitorTopbar />}
      <main
        className={cn(
          "mx-auto min-h-0 w-full max-w-md flex-1",
          isImmersiveAiGuide ? "overflow-hidden" : "overflow-y-auto pb-4",
        )}
      >
        {children}
      </main>
      <VisitorNav />
    </div>
  );
}
