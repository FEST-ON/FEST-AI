"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, DoorOpen, Hourglass, Ticket as TicketIcon, ArrowRight } from "lucide-react";
import { fetchOpsSnapshot } from "@/widgets/dashboard-stats/data";
import { fetchCongestion } from "@/entities/festival";
import { fetchTickets } from "@/entities/ticket";
import { fetchOperationResources } from "@/entities/program";
import { StatCard } from "@/shared/ui/stat-card";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { CongestionList } from "@/widgets/congestion-map/congestion-list";
import { NotificationAdminPanel } from "@/features/notification/ui/notification-admin-panel";

const PRIORITY_STYLE = {
  높음: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  중간: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  낮음: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
} as const;

export default function AdminDashboardPage() {
  const { data: ops, isLoading: opsLoading } = useQuery({ queryKey: ["ops-snapshot"], queryFn: fetchOpsSnapshot });
  const { data: congestion } = useQuery({ queryKey: ["congestion"], queryFn: fetchCongestion });
  const { data: tickets } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const { data: resources } = useQuery({ queryKey: ["operation-resources"], queryFn: fetchOperationResources });

  const openTickets = (tickets ?? []).filter((t) => t.status !== "완료").slice(0, 4);
  const issueResources = (resources ?? []).filter((r) => r.status === "이슈");

  const maxHourly = Math.max(...(ops?.hourlyEntries.map((h) => h.count) ?? [1]));

  return (
    <div className="space-y-6">
      {opsLoading || !ops ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="오늘 예약" value={ops.reservationsToday.toLocaleString()} helper="누적 예약 건수" icon={CalendarCheck} tone="primary" />
          <StatCard label="오늘 입장" value={ops.entryToday.toLocaleString()} helper="QR 체크인 기준" icon={DoorOpen} />
          <StatCard label="평균 대기" value={`${ops.avgWaitMinutes}분`} helper="전체 프로그램 평균" icon={Hourglass} />
          <StatCard label="쿠폰 발급/사용" value={`${ops.couponsIssued} / ${ops.couponsUsed}`} helper="지역상권 디지털 쿠폰" icon={TicketIcon} />
          <StatCard label="현재 체류 인원(추정)" value={ops.activeVisitorsEstimate.toLocaleString()} helper="실시간 혼잡도 기반 추정" tone="success" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">시간대별 입장 현황</h2>
            <span className="text-xs text-muted-foreground">오늘 기준</span>
          </div>
          {opsLoading || !ops ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="flex h-40 items-end gap-2.5">
              {ops.hourlyEntries.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-muted">
                    <div
                      className="w-full rounded-md bg-primary transition-all"
                      style={{ height: `${(h.count / maxHourly) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{h.hour}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">실시간 혼잡 현황</h2>
            <Link href="/admin/programs" className="text-xs font-medium text-primary">구역관리</Link>
          </div>
          {!congestion ? <Skeleton className="h-40 w-full" /> : <CongestionList zones={congestion} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">처리 필요 민원·공지·사고</h2>
            <Link href="/admin/tickets" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              전체보기 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {openTickets.length === 0 && <p className="text-xs text-muted-foreground">처리 대기 중인 티켓이 없어요.</p>}
            {openTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.type} · {t.assignee} · {t.createdAt}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[t.priority]}`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">운영 자원 이슈</h2>
            <Link href="/admin/programs" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              통합 운영관리 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {issueResources.length === 0 && <p className="text-xs text-muted-foreground">현재 이슈가 없어요.</p>}
            {issueResources.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.category} · {r.location}</p>
                </div>
                <Badge variant="destructive" className="shrink-0 text-[10px]">{r.note}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NotificationAdminPanel />
    </div>
  );
}

