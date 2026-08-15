"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { EmergencyAnnouncementBanner } from "@/features/notification/ui/emergency-announcement-banner";
import { useTranslation } from "@/shared/lib/i18n";
import { cn } from "@/shared/lib/utils";
import { VisitorNav } from "@/widgets/visitor-nav/visitor-nav";
import { VisitorTopbar } from "@/widgets/visitor-nav/visitor-topbar";

const KIOSK_ROUTES = ["/visitor", "/visitor/ai-guide", "/visitor/map"];

export function VisitorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
