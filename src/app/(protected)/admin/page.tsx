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
import { QueryState } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { FestivalBriefCard } from "@/features/festival-brief/ui/festival-brief-card";
import { LANGUAGE_BY_LOCALE } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

export default function AdminDashboardPage() {
  const opsQuery = useQuery({ queryKey: ["ops-snapshot"], queryFn: fetchOpsSnapshot });
  const ops = opsQuery.data;
  const ticketsQuery = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const resourcesQuery = useQuery({ queryKey: ["operation-resources"], queryFn: fetchOperationResources });
  const { data: tickets } = ticketsQuery;
  const { data: resources } = resourcesQuery;

  const openTickets = (tickets ?? []).filter((t) => t.status !== "완료").slice(0, 4);
  const issueResources = (resources ?? []).filter((r) => r.status === "이슈");

  return (
    <div className="space-y-6">
      <FestivalBriefCard />

      <QueryState
        query={opsQuery}
        skeleton={<SkeletonList count={4} className="h-24 rounded-2xl" wrapperClassName="grid grid-cols-2 gap-3 space-y-0 lg:grid-cols-4" />}
      >
        {(ops) => (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="방문 세션" value={ops.visitors.toLocaleString()} helper="백엔드 누적 방문 세션" icon={Users} tone="primary" />
            <StatCard label="진행 중 예약" value={ops.activeBookings.toLocaleString()} helper="확정·대기·호출 상태" icon={CalendarCheck} href="/admin/programs" />
            <StatCard label="처리 필요 티켓" value={ops.openTickets.toLocaleString()} helper="미해결 민원·사고" icon={TicketIcon} href="/admin/tickets" />
            <StatCard label="승인 참여업체" value={ops.approvedBusinesses.toLocaleString()} helper="축제 참여 승인 완료" icon={Store} href="/admin/businesses" />
            <StatCard label="쿠폰 발급" value={ops.couponIssues.toLocaleString()} helper="참여업체 쿠폰 누적 발급" icon={TicketIcon} href="/admin/businesses" />
            <StatCard label="ESG 포인트 발급" value={`${ops.pointsIssued.toLocaleString()}P`} helper="리워드 캠페인 누적 지급" icon={Leaf} href="/admin/rewards" />
          </div>
        )}
      </QueryState>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">처리 필요 민원·공지·사고</h2>
            <Link href="/admin/tickets" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              전체보기 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            <QueryState
              query={ticketsQuery}
              empty="처리 대기 중인 티켓이 없어요."
              emptyWhen={openTickets.length === 0}
              skeleton={<Skeleton className="h-16 w-full rounded-xl" />}
            >
              {() => (
                openTickets.map((t) => (
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
                ))
              )}
            </QueryState>
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
            <QueryState
              query={resourcesQuery}
              empty="현재 이슈가 없어요."
              emptyWhen={issueResources.length === 0}
              skeleton={<Skeleton className="h-16 w-full rounded-xl" />}
            >
              {() => (
                issueResources.map((r) => (
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
                ))
              )}
            </QueryState>
          </div>
        </div>
      </div>

      {/* AI-05 언어별 이용 로그: 방문 세션 언어와 첫 발화 자동 전환 건수 */}
      {ops && ops.languages.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">언어별 이용</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {ops.languages.map((row) => (
              <div key={row.language} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{LANGUAGE_BY_LOCALE[row.language as Locale] ?? row.language}</p>
                <p className="text-lg font-bold text-primary">{row.sessions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">키오스크 {row.kioskSessions} · 자동 전환 {row.autoSwitched}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
