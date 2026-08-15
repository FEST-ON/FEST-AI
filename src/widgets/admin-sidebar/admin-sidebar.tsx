"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users2, MapPinned, FileCheck2, Ticket, TicketCheck, TicketPercent, Megaphone, Sparkles, Leaf, History, LogOut, Activity, UserCog, Store, Gift, FileSearch, Building2, KeyRound, ChevronDown, type LucideIcon } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { cn } from "@/shared/lib/utils";
import { logoutAdmin } from "@/shared/lib/api";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import { ADMIN_ROLE_LABEL, visibleNavItems, type AdminNavItem } from "@/shared/lib/permissions";

// 권한 정의(shared/lib/permissions)는 아이콘을 모르므로 여기서 href로 이어붙입니다.
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/programs": Users2,
  "/admin/field": Activity,
  "/admin/staff": UserCog,
  "/admin/businesses": Store,
  "/admin/rewards": Gift,
  "/admin/documents": FileSearch,
  "/admin/map-locations": MapPinned,
  "/admin/content": FileCheck2,
  "/admin/tickets": Ticket,
  "/admin/bookings": TicketCheck,
  "/admin/coupons": TicketPercent,
  "/admin/announcements": Megaphone,
  "/admin/ai-insights": Sparkles,
  "/admin/esg": Leaf,
  "/admin/audit-logs": History,
  "/admin/festival": Building2,
  "/admin/members": KeyRound,
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

/**
 * 사이드바와 모바일 시트가 공유하는 메뉴 목록. 그룹은 <details>로 접고, 현재 보고 있는
 * 화면이 속한 그룹만 펼칩니다(open은 렌더마다 다시 계산 = 이동하면 해당 그룹이 열림).
 */
export function AdminNavLinks({ role }: { role: string | undefined }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const groups = new Map<string | undefined, AdminNavItem[]>();
  for (const item of visibleNavItems(role)) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }

  const renderLink = ({ href, label }: AdminNavItem) => {
    const Icon = NAV_ICONS[href];
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActive(href)
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="size-4.5" />
        {label}
      </Link>
    );
  };

  return (
    <>
      {[...groups].map(([group, items]) =>
        group === undefined ? (
          items.map(renderLink)
        ) : (
          <details key={group} open={items.some((item) => isActive(item.href))} className="group">
            <summary className="mt-1 flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50 hover:text-sidebar-foreground [&::-webkit-details-marker]:hidden">
              {group}
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-1">{items.map(renderLink)}</div>
          </details>
        ),
      )}
    </>
  );
}

export function AdminSidebar() {
  const user = useAdminSessionStore((s) => s.user);


  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo tone="dark" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        <AdminNavLinks role={user?.role} />
      </nav>

      <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-xl border border-sidebar-border p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-xs font-bold text-primary-tint">
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
