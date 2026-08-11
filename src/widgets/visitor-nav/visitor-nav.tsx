"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, MapPin, Ticket, Stamp } from "lucide-react";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenuSettingsStore } from "@/features/visitor-menu-settings/model/store";
import type { VisitorMenuKey } from "@/features/visitor-menu-settings/model/store";
import { cn } from "@/shared/lib/utils";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof Home;
  kiosk: boolean;
  menuKey?: VisitorMenuKey;
}[] = [
  { href: "/visitor", label: "홈", icon: Home, kiosk: true },
  { href: "/visitor/ai-guide", label: "AI안내", icon: Sparkles, kiosk: true },
  { href: "/visitor/map", label: "지도", icon: MapPin, kiosk: true },
  { href: "/visitor/reservation", label: "예약", icon: Ticket, kiosk: false, menuKey: "reservation" },
  { href: "/visitor/stamp-tour", label: "스탬프", icon: Stamp, kiosk: false, menuKey: "stampTour" },
];

export function VisitorNav() {
  const pathname = usePathname();
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const menuSettings = useVisitorMenuSettingsStore();
  const navItems = NAV_ITEMS.filter(
    (item) =>
      (visitorMode === "qr" || item.kiosk) &&
      (!item.menuKey || menuSettings[item.menuKey]),
  );

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/visitor" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/15")} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
