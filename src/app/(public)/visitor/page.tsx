"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Sparkles, Ticket, Stamp, ClipboardList, ArrowRight } from "lucide-react";
import { fetchFestivalInfo, fetchSchedule } from "@/entities/festival";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenuSettingsStore } from "@/features/visitor-menu-settings/model/store";
import type { VisitorMenuKey } from "@/features/visitor-menu-settings/model/store";
import { useTranslation } from "@/shared/lib/i18n";
import type { Dictionary } from "@/shared/lib/i18n";
import { Badge } from "@/shared/ui/badge";
import { EmptyState, ErrorState } from "@/shared/ui/query-state";

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
  { href: "/visitor/reservation", labelKey: "reservation", icon: Ticket, kiosk: false, menuKey: "reservation" },
  { href: "/visitor/stamp-tour", labelKey: "stampTour", icon: Stamp, kiosk: false, menuKey: "stampTour" },
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
  const menuSettings = useVisitorMenuSettingsStore();
  const quickMenu = QUICK_MENU.filter(
    (item) =>
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
        <Badge className="bg-white/15 text-white hover:bg-white/15">
          {festival?.period.start.slice(5).replace("-", "/")} ~ {festival?.period.end.slice(5).replace("-", "/")}
        </Badge>
        <h2 className="mt-2 text-lg font-bold leading-snug">
          {festival?.name ?? (festivalQuery.isError ? t.common.loadFailed : t.home.festivalLoading)}
        </h2>
        <p className="mt-1 text-xs text-primary-foreground/75">{festival?.location}</p>
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
            <span className="text-[11px] font-semibold text-foreground">{t.home.quickMenu[labelKey]}</span>
          </Link>
        ))}
      </div>

      {visitorMode === "qr" && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t.home.todayProgramTitle}</h3>
            <Link href="/visitor/schedule" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              {t.home.scheduleLink} <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {scheduleQuery.isError ? (
              <ErrorState message={t.common.loadFailed} retryLabel={t.common.retry} onRetry={() => scheduleQuery.refetch()} />
            ) : !scheduleQuery.isLoading && !schedule?.length ? (
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
                <Badge variant="outline" className="shrink-0 text-[10px]">{item.category}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
