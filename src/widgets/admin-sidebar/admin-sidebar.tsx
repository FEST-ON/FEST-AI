"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users2, Ticket, Sparkles, Leaf, LogOut } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { cn } from "@/shared/lib/utils";
import { logoutAdmin } from "@/shared/lib/api";

const NAV_ITEMS = [
  { href: "/admin", label: "운영 대시보드", icon: LayoutDashboard },
  { href: "/admin/programs", label: "통합 운영관리", icon: Users2 },
  { href: "/admin/tickets", label: "민원·공지·사고", icon: Ticket },
  { href: "/admin/ai-insights", label: "AI 민원 인사이트", icon: Sparkles },
  { href: "/admin/esg", label: "ESG 성과관리", icon: Leaf },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo tone="dark" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-xl border border-sidebar-border p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
          김
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">김민준 주무관</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">영등포구청 축제운영과</p>
        </div>
        <button
          onClick={() => { logoutAdmin(); router.push("/"); router.refresh(); }}
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label="로그아웃"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
