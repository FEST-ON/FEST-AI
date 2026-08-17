"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, MapPin, Ticket, BadgePercent } from "lucide-react";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenus } from "@/features/visitor-menu-settings";
import type { VisitorMenuKey } from "@/features/visitor-menu-settings";
import { useTranslation } from "@/shared/lib/i18n";
import type { Dictionary } from "@/shared/lib/i18n";
import { cn } from "@/shared/lib/utils";

// 홈 퀵메뉴가 이 목록을 빼고 그리므로(중복 제거) 여기가 하단 탭의 단일 출처다.
export const NAV_ITEMS: {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: typeof Home;
  kiosk: boolean;
  menuKey?: VisitorMenuKey;
}[] = [
  { href: "/visitor", labelKey: "home", icon: Home, kiosk: true },
  { href: "/visitor/ai-guide", labelKey: "aiGuide", icon: Sparkles, kiosk: true },
  { href: "/visitor/map", labelKey: "map", icon: MapPin, kiosk: true },
  { href: "/visitor/reservation", labelKey: "reservation", icon: Ticket, kiosk: false, menuKey: "reservation" },
  { href: "/visitor/coupons", labelKey: "coupons", icon: BadgePercent, kiosk: false, menuKey: "coupons" },
];

export function VisitorNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const menuSettings = useVisitorMenus();
  const navItems = NAV_ITEMS.filter(
    (item) =>
      (visitorMode === "qr" || item.kiosk) &&
      (!item.menuKey || menuSettings[item.menuKey]),
  );

  return (
    // 아이폰 홈 인디케이터와 겹치지 않도록 안전 영역만큼 아래를 띄운다(viewportFit: cover와 한 쌍).
    <nav className="sticky bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = href === "/visitor" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.6875rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/15")} strokeWidth={active ? 2.4 : 2} />
              {t.nav[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
