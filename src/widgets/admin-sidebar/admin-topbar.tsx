"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Users2, Ticket, Sparkles, Leaf } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { AdminLogoutButton } from "./admin-sidebar";

const NAV_ITEMS = [
  { href: "/admin", label: "운영 대시보드", icon: LayoutDashboard },
  { href: "/admin/programs", label: "통합 운영관리", icon: Users2 },
  { href: "/admin/tickets", label: "민원·공지·사고", icon: Ticket },
  { href: "/admin/ai-insights", label: "AI 민원 인사이트", icon: Sparkles },
  { href: "/admin/esg", label: "ESG 성과관리", icon: Leaf },
] as const;

const TITLES: Record<string, string> = {
  "/admin": "운영 대시보드",
  "/admin/programs": "통합 운영관리",
  "/admin/tickets": "민원·공지·사고 티켓",
  "/admin/ai-insights": "AI 민원 인사이트",
  "/admin/esg": "ESG 성과관리",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "FESTAI 관리자";
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader>
              <SheetTitle className="sr-only">메뉴</SheetTitle>
              <Logo tone="dark" />
            </SheetHeader>
            <nav className="space-y-1 px-3 py-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
                    )}
                  >
                    <Icon className="size-4.5" />
                    {label}
                  </Link>
                );
              })}
              <AdminLogoutButton
                showLabel
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70"
              />
            </nav>
          </SheetContent>
        </Sheet>
        <div>
          <h1 className="text-base font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>
      </div>
    </header>
  );
}

