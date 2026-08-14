"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Users, Store, Ticket as TicketIcon, ArrowRight, MapPinned } from "lucide-react";
import { fetchOpsSnapshot } from "@/widgets/dashboard-stats/data";
import { fetchTickets, PRIORITY_STYLE } from "@/entities/ticket";
import { fetchOperationResources } from "@/entities/program";
import { StatCard } from "@/shared/ui/stat-card";
import { Badge } from "@/shared/ui/badge";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { FestivalBriefCard } from "@/features/festival-brief/ui/festival-brief-card";

export default function AdminDashboardPage() {
  const opsQuery = useQuery({ queryKey: ["ops-snapshot"], queryFn: fetchOpsSnapshot });
  const ticketsQuery = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const resourcesQuery = useQuery({ queryKey: ["operation-resources"], queryFn: fetchOperationResources });
  const { data: ops, isLoading: opsLoading } = opsQuery;
  const { data: tickets } = ticketsQuery;
  const { data: resources } = resourcesQuery;

  const openTickets = (tickets ?? []).filter((t) => t.status !== "완료").slice(0, 4);
  const issueResources = (resources ?? []).filter((r) => r.status === "이슈");

  return (
    <div className="space-y-6">
      <FestivalBriefCard />

      {opsLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : opsQuery.isError || !ops ? (
        <ErrorState message={queryErrorMessage(opsQuery.error)} onRetry={() => opsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="방문 세션" value={ops.visitors.toLocaleString()} helper="백엔드 누적 방문 세션" icon={Users} tone="primary" />
          <StatCard label="진행 중 예약" value={ops.active_bookings.toLocaleString()} helper="확정·대기·호출 상태" icon={CalendarCheck} />
          <StatCard label="처리 필요 티켓" value={ops.open_tickets.toLocaleString()} helper="미해결 민원·사고" icon={TicketIcon} />
          <StatCard label="승인 참여업체" value={ops.approved_businesses.toLocaleString()} helper="축제 참여 승인 완료" icon={Store} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold">데이터 연동 상태</h2><Badge variant="outline">LIVE API</Badge></div>
          {opsLoading ? <Skeleton className="mt-4 h-24 w-full" /> : opsQuery.isError || !ops ? <ErrorState className="mt-4" message={queryErrorMessage(opsQuery.error)} onRetry={() => opsQuery.refetch()} /> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">쿠폰 발급</p><p className="mt-1 text-2xl font-extrabold">{ops.coupon_issues.toLocaleString()}</p></div>
            <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">ESG 포인트 발급</p><p className="mt-1 text-2xl font-extrabold">{ops.points_issued.toLocaleString()}P</p></div>
            <p className="sm:col-span-2 text-[11px] text-muted-foreground">근거 테이블: {ops.sources.join(" · ")}</p>
          </div>}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
          <div>
            <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MapPinned className="size-5" /></span>
            <h2 className="mt-4 text-sm font-bold text-foreground">지도 부스 지점</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">카카오맵에 노출할 부스·시설 좌표를 등록하고 공개 여부를 설정하세요.</p>
          </div>
          <Link href="/admin/map-locations" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-primary">지도 설정 열기 <ArrowRight className="size-3" /></Link>
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
            {ticketsQuery.isError ? (
              <ErrorState message={queryErrorMessage(ticketsQuery.error)} onRetry={() => ticketsQuery.refetch()} />
            ) : ticketsQuery.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : openTickets.length === 0 ? (
              <EmptyState message="처리 대기 중인 티켓이 없어요." />
            ) : null}
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
            {resourcesQuery.isError ? (
              <ErrorState message={queryErrorMessage(resourcesQuery.error)} onRetry={() => resourcesQuery.refetch()} />
            ) : resourcesQuery.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : issueResources.length === 0 ? (
              <EmptyState message="현재 이슈가 없어요." />
            ) : null}
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

    </div>
  );
}
