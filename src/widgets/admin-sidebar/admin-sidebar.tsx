"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users2, MapPinned, FileCheck2, Ticket, Sparkles, Leaf, History, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { cn } from "@/shared/lib/utils";
import { logoutAdmin } from "@/shared/lib/api";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import { ADMIN_ROLE_LABEL, visibleNavItems } from "@/shared/lib/permissions";

// 권한 정의(shared/lib/permissions)는 아이콘을 모르므로 여기서 href로 이어붙입니다.
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/programs": Users2,
  "/admin/map-locations": MapPinned,
  "/admin/content": FileCheck2,
  "/admin/tickets": Ticket,
  "/admin/ai-insights": Sparkles,
  "/admin/esg": Leaf,
  "/admin/audit-logs": History,
};

export function AdminLogoutButton({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    try {
      await logoutAdmin();
    } finally {
      queryClient.clear();
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button onClick={() => void logout()} className={className} aria-label="로그아웃">
      <LogOut className="size-4" />
      {showLabel && <span>로그아웃</span>}
    </button>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAdminSessionStore((s) => s.user);
  const navItems = visibleNavItems(user?.role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo tone="dark" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ href, label }) => {
          const Icon = NAV_ICONS[href];
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
          {user?.name?.slice(0, 1) ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">{user?.name ?? "알 수 없음"}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">
            {user?.role ? (ADMIN_ROLE_LABEL[user.role] ?? user.role) : ""}
          </p>
        </div>
        <AdminLogoutButton className="text-sidebar-foreground/50 hover:text-sidebar-foreground" />
      </div>
    </aside>
  );
}
