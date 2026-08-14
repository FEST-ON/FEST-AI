"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { fetchAuditLogs, type AuditLogEntry, type AuditLogFilter } from "@/entities/audit-log";
import { useAdminSessionStore, type AdminUser } from "@/features/admin-auth/model/store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

// 백엔드 스펙에 action enum이 없어, audit() 호출부를 전수 조사해 정리한 값입니다.
// 백엔드에 새 audit() 호출이 추가되면 여기에도 함께 등록해야 합니다.
const ACTION_DESCRIPTIONS: Record<string, string> = {
  LOGIN: "관리자 로그인",
  CREATE: "리소스 생성 (축제, ESG 측정값)",
  UPDATE: "리소스 수정 (대상 유형에 수정된 테이블이 기록돼요)",
  CLONE: "이전 축제 복제",
  TRANSITION: "상태 변경 (예: 티켓 접수→처리중→완료)",
  ASSIGN: "담당자 배정",
  SUBMIT: "입점업체 신청 제출",
  PUBLISH: "게시 (콘텐츠, 공지)",
  PUBLISH_EMERGENCY: "긴급 공지 게시",
  UNPUBLISH: "게시 종료",
  CLOSE: "공지 종료",
  GENERATE: "ESG 리포트 생성",
  EXPORT: "데이터 내보내기",
  REVERSE: "쿠폰 사용 취소",
};

function describeAction(action: string) {
  return ACTION_DESCRIPTIONS[action] ?? "설명이 등록되지 않은 행위예요";
}

function formatValue(value: unknown): string {
  if (value === undefined) return "-";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function describeChange(log: AuditLogEntry): string {
  const before = log.beforeData ?? {};
  const after = log.afterData ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (keys.length === 0) return "-";
  return keys
    .map((key) => {
      const hasBefore = key in before;
      const hasAfter = key in after;
      if (hasBefore && hasAfter) return `${key}: ${formatValue(before[key])} → ${formatValue(after[key])}`;
      if (hasAfter) return `${key}: ${formatValue(after[key])}`;
      return `${key}: ${formatValue(before[key])} 삭제됨`;
    })
    .join(", ");
}

function describeActor(log: AuditLogEntry, currentUser: AdminUser | null) {
  if (log.actorName) return log.actorName;
  if (log.actorEmail) return log.actorEmail;
  if (currentUser && log.actorId === currentUser.id) return `${currentUser.name} (본인)`;
  if (log.actorId) return `${log.actorId.slice(0, 8)}…`;
  return "알 수 없음";
}

export default function AuditLogsPage() {
  const currentUser = useAdminSessionStore((s) => s.user);
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [actionInput, setActionInput] = useState("");
  const [resourceTypeInput, setResourceTypeInput] = useState("");

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs", filter],
    queryFn: () => fetchAuditLogs(filter),
  });

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilter({
      action: actionInput.trim() || undefined,
      resourceType: resourceTypeInput.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="size-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          로그인·변경·승인·내보내기 등 주요 행위를 누가, 언제, 무엇에 대해 했는지 기록해요.
        </p>
      </div>

      <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-action">행위(action)</Label>
          <Input
            id="filter-action"
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value)}
            placeholder="예: LOGIN, TICKET_TRANSITION"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-resource-type">대상 유형(resourceType)</Label>
          <Input
            id="filter-resource-type"
            value={resourceTypeInput}
            onChange={(event) => setResourceTypeInput(event.target.value)}
            placeholder="예: TICKET, ANNOUNCEMENT"
            className="w-56"
          />
        </div>
        <Button type="submit" size="sm">
          <Search className="size-3.5" />
          조회
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">행위(action) 설명</p>
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {Object.entries(ACTION_DESCRIPTIONS).map(([action, description]) => (
            <div key={action} className="flex items-baseline gap-2 text-xs">
              <dt><Badge variant="outline" className="text-[10px]">{action}</Badge></dt>
              <dd className="text-muted-foreground">{description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState className="m-4" message={queryErrorMessage(error)} onRetry={() => refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState className="m-4 p-10" message="기록된 감사 로그가 없어요." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시각</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>행위</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>변경 내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </TableCell>
                  <TableCell className="text-sm">{describeActor(log, currentUser)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]" title={describeAction(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.resourceType ?? "-"}{log.resourceId ? ` · ${log.resourceId}` : ""}
                  </TableCell>
                  <TableCell className="text-xs whitespace-normal text-muted-foreground">{describeChange(log)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
