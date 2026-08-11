"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Sparkles, Ticket, Stamp, ClipboardList, ArrowRight } from "lucide-react";
import { fetchCongestion, fetchFestivalInfo, fetchSchedule } from "@/entities/festival";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenuSettingsStore } from "@/features/visitor-menu-settings/model/store";
import type { VisitorMenuKey } from "@/features/visitor-menu-settings/model/store";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { CongestionList } from "@/widgets/congestion-map/congestion-list";

const QUICK_MENU: {
  href: string;
  label: string;
  icon: typeof Sparkles;
  tone: string;
  kiosk: boolean;
  menuKey?: VisitorMenuKey;
}[] = [
  { href: "/visitor/ai-guide", label: "AI 안내", icon: Sparkles, tone: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", kiosk: true },
  { href: "/visitor/schedule", label: "전체일정", icon: CalendarDays, tone: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300", kiosk: false },
  { href: "/visitor/map", label: "지도·시설", icon: MapPin, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", kiosk: true },
  { href: "/visitor/reservation", label: "예약·대기", icon: Ticket, tone: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", kiosk: false, menuKey: "reservation" },
  { href: "/visitor/stamp-tour", label: "스탬프투어", icon: Stamp, tone: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300", kiosk: false, menuKey: "stampTour" },
  { href: "/visitor/survey", label: "만족도조사", icon: ClipboardList, tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300", kiosk: false, menuKey: "survey" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "상쾌한 아침이에요";
  if (hour < 17) return "즐거운 오후예요";
  return "활기찬 저녁이에요";
}

export default function VisitorHomePage() {
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const menuSettings = useVisitorMenuSettingsStore();
  const quickMenu = QUICK_MENU.filter(
    (item) =>
      (visitorMode === "qr" || item.kiosk) &&
      (!item.menuKey || menuSettings[item.menuKey]),
  );
  const { data: festival } = useQuery({ queryKey: ["festival-info"], queryFn: fetchFestivalInfo });
  const { data: schedule } = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  const { data: congestion, isLoading: congestionLoading } = useQuery({
    queryKey: ["congestion"],
    queryFn: fetchCongestion,
  });

  const today = new Date().toLocaleDateString("ko-KR", {
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
          {getGreeting()}, 방문객님 👋
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-blue-700 p-5 text-primary-foreground shadow-md">
        <Badge className="bg-white/15 text-white hover:bg-white/15">
          {festival?.period.start.slice(5).replace("-", "/")} ~ {festival?.period.end.slice(5).replace("-", "/")}
        </Badge>
        <h2 className="mt-2 text-lg font-bold leading-snug">{festival?.name ?? "축제 정보를 불러오는 중..."}</h2>
        <p className="mt-1 text-xs text-blue-100">{festival?.location}</p>
        <Link
          href="/visitor/ai-guide"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-blue-700"
        >
          <Sparkles className="size-3.5" /> AI에게 오늘 코스 추천받기
        </Link>
      </div>

      <div className={visitorMode === "kiosk" ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
        {quickMenu.map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card py-3.5 text-center shadow-sm"
          >
            <span className={`inline-flex size-9 items-center justify-center rounded-full ${tone}`}>
              <Icon className="size-4.5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">실시간 혼잡도</h3>
          <Link href="/visitor/map" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            지도 보기 <ArrowRight className="size-3" />
          </Link>
        </div>
        {congestionLoading || !congestion ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <CongestionList zones={congestion.slice(0, 2)} />
        )}
      </section>

      {visitorMode === "qr" && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">오늘의 프로그램</h3>
            <Link href="/visitor/schedule" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              전체일정 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
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
