"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgePercent, CalendarDays, MapPin, RefreshCw, Route, Sparkles, Store, Ticket, Stamp, ClipboardList, ArrowRight, ShieldCheck } from "lucide-react";
import { fetchFestivalInfo, fetchSchedule } from "@/entities/festival";
import { CrowdList } from "@/features/crowd/ui/crowd-list";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenus } from "@/features/visitor-menu-settings";
import type { VisitorMenuKey } from "@/features/visitor-menu-settings";
import { useTranslation } from "@/shared/lib/i18n";
import type { Dictionary } from "@/shared/lib/i18n";
import { Badge } from "@/shared/ui/badge";
import { LastUpdated } from "@/shared/ui/last-updated";
import { EmptyState, ErrorState } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { NAV_ITEMS } from "@/widgets/visitor-nav/visitor-nav";

const QUICK_MENU: {
  href: string;
  labelKey: keyof Dictionary["home"]["quickMenu"];
  icon: typeof Sparkles;
  kiosk: boolean;
  menuKey?: VisitorMenuKey;
}[] = [
  { href: "/visitor/ai-guide", labelKey: "aiGuide", icon: Sparkles, kiosk: true },
  { href: "/visitor/schedule", labelKey: "schedule", icon: CalendarDays, kiosk: false },
  { href: "/visitor/map", labelKey: "map", icon: MapPin, kiosk: true },
  { href: "/visitor/course", labelKey: "course", icon: Route, kiosk: true },
  { href: "/visitor/reservation", labelKey: "reservation", icon: Ticket, kiosk: false, menuKey: "reservation" },
  { href: "/visitor/stamp-tour", labelKey: "stampTour", icon: Stamp, kiosk: false, menuKey: "stampTour" },
  { href: "/visitor/coupons", labelKey: "coupons", icon: BadgePercent, kiosk: false, menuKey: "coupons" },
  { href: "/visitor/nearby", labelKey: "nearby", icon: Store, kiosk: true, menuKey: "nearby" },
  { href: "/visitor/survey", labelKey: "survey", icon: ClipboardList, kiosk: false, menuKey: "survey" },
];

function getGreeting(t: Dictionary) {
  const hour = new Date().getHours();
  if (hour < 11) return t.home.greetingMorning;
  if (hour < 17) return t.home.greetingAfternoon;
  return t.home.greetingEvening;
}

export default function VisitorHomePage() {
  const { t, locale, bcp47 } = useTranslation();
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const menuSettings = useVisitorMenus();
  // 하단 탭·히어로 CTA로 이미 한 번에 닿는 메뉴는 그리드에서 뺀다.
  const quickMenu = QUICK_MENU.filter(
    (item) =>
      !NAV_ITEMS.some((nav) => nav.href === item.href) &&
      (visitorMode === "qr" || item.kiosk) &&
      (!item.menuKey || menuSettings[item.menuKey]),
  );
  const festivalQuery = useQuery({ queryKey: ["festival-info", locale] as const, queryFn: () => fetchFestivalInfo(locale) });
  const scheduleQuery = useQuery({ queryKey: ["schedule", locale] as const, queryFn: () => fetchSchedule(locale) });
  const festival = festivalQuery.data;
  const schedule = scheduleQuery.data;

  const today = new Date().toLocaleDateString(bcp47, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{today}</p>
        <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-foreground">
          {getGreeting(t)}{t.home.greetingSuffix} 👋
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
        {/* 값이 없을 때 배지에 " ~ "만 남아 깨져 보이던 자리 — 도착 전에는 자리표시자를 둔다. */}
        {!festival ? (
          <div className="space-y-2" aria-busy={festivalQuery.isLoading}>
            <Skeleton className="h-5 w-28 rounded-full bg-white/25" />
            <Skeleton className="h-6 w-48 rounded-md bg-white/25" />
            <Skeleton className="h-4 w-32 rounded-md bg-white/20" />
            {!festivalQuery.isLoading && (
              <button
                type="button"
                onClick={() => festivalQuery.refetch()}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <RefreshCw className="size-3.5" /> {t.common.loadFailed} · {t.common.retry}
              </button>
            )}
          </div>
        ) : (
          <>
            <Badge className="bg-white/15 text-white hover:bg-white/15">
              {festival.period.start.slice(5).replace("-", "/")} ~ {festival.period.end.slice(5).replace("-", "/")}
            </Badge>
            <h2 className="mt-2 text-lg font-bold leading-snug">{festival.name}</h2>
            <p className="mt-1 text-xs text-primary-foreground/75">{festival.location}</p>
            <LastUpdated
              value={festival.updatedAt}
              bcp47={bcp47}
              label={t.common.lastUpdated}
              className="mt-1.5 text-primary-foreground/75"
            />
          </>
        )}
        <Link
          href="/visitor/ai-guide"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 text-xs font-bold text-primary"
        >
          <Sparkles className="size-3.5" /> {t.home.aiCta}
        </Link>
      </div>

      <div className={visitorMode === "kiosk" ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
        {quickMenu.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card py-3.5 text-center"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </span>
            <span className="text-[0.6875rem] font-semibold text-foreground">{t.home.quickMenu[labelKey]}</span>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{t.home.congestionTitle}</h3>
          <Link href="/visitor/map" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            {t.home.mapLink} <ArrowRight className="size-3" />
          </Link>
        </div>
        <CrowdList limit={3} />
      </section>

      {visitorMode === "qr" && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t.home.todayProgramTitle}</h3>
            <Link href="/visitor/schedule" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              {t.home.scheduleLink} <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {/* 끝내 목록을 받지 못한 경우를 빈 목록으로 읽으면 장애가 "행사 없음"이 된다. */}
            {!schedule ? (
              scheduleQuery.isLoading ? (
                <SkeletonList count={2} className="h-14 w-full rounded-xl" />
              ) : (
                <ErrorState message={t.common.loadFailed} retryLabel={t.common.retry} onRetry={() => scheduleQuery.refetch()} />
              )
            ) : schedule.length === 0 ? (
              <EmptyState message={t.common.empty} />
            ) : null}
            {(schedule ?? []).slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="text-sm font-bold text-primary">{item.time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.stage}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[0.625rem]">{item.category}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OPS-11: 수집 항목·보유기간 고지와 열람·삭제 요구 창구는 방문객이 스스로 찾을 수 있어야 한다. */}
      {visitorMode === "qr" && (
        <Link
          href="/visitor/privacy"
          className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs font-semibold text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-primary" /> {t.privacy.title}
          </span>
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
