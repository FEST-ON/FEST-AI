"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Users, Store, Ticket as TicketIcon, ArrowRight, Leaf } from "lucide-react";
import { fetchOpsSnapshot } from "@/widgets/dashboard-stats/data";
import { fetchTickets, PRIORITY_TONE } from "@/entities/ticket";
import { StatusPill } from "@/shared/ui/status-pill";
import { fetchOperationResources } from "@/entities/program";
import { StatCard } from "@/shared/ui/stat-card";
import { Badge } from "@/shared/ui/badge";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
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
        <SkeletonList count={4} className="h-24 rounded-2xl" wrapperClassName="grid grid-cols-2 gap-3 space-y-0 lg:grid-cols-4" />
      ) : opsQuery.isError || !ops ? (
        <ErrorState message={queryErrorMessage(opsQuery.error)} onRetry={() => opsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="방문 세션" value={ops.visitors.toLocaleString()} helper="백엔드 누적 방문 세션" icon={Users} tone="primary" />
          <StatCard label="진행 중 예약" value={ops.active_bookings.toLocaleString()} helper="확정·대기·호출 상태" icon={CalendarCheck} href="/admin/programs" />
          <StatCard label="처리 필요 티켓" value={ops.open_tickets.toLocaleString()} helper="미해결 민원·사고" icon={TicketIcon} href="/admin/tickets" />
          <StatCard label="승인 참여업체" value={ops.approved_businesses.toLocaleString()} helper="축제 참여 승인 완료" icon={Store} href="/admin/businesses" />
          <StatCard label="쿠폰 발급" value={ops.coupon_issues.toLocaleString()} helper="참여업체 쿠폰 누적 발급" icon={TicketIcon} href="/admin/businesses" />
          <StatCard label="ESG 포인트 발급" value={`${ops.points_issued.toLocaleString()}P`} helper="리워드 캠페인 누적 지급" icon={Leaf} href="/admin/rewards" />
        </div>
      )}

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
              <Link
                key={t.id}
                href="/admin/tickets"
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.type} · {t.assignee} · {t.createdAt}</p>
                </div>
                <StatusPill tone={PRIORITY_TONE[t.priority]} className="shrink-0">
                  {t.priority}
                </StatusPill>
              </Link>
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
              <Link
                key={r.id}
                href="/admin/programs"
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.category} · {r.location}</p>
                </div>
                <Badge variant="destructive" className="shrink-0 text-[10px]">{r.note}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
