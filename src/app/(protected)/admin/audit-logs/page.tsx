"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, History, Search } from "lucide-react";
import { AUDIT_LOG_MAX_LIMIT, fetchAuditLogs, type AuditLogEntry, type AuditLogFilter } from "@/entities/audit-log";
import { createExport, fetchJob } from "@/features/festival-admin/api/festival-admin";
import { useAdminSessionStore, type AdminUser } from "@/features/admin-auth/model/store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { SkeletonList } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { seoulDateTime } from "@/shared/lib/utils";

// 백엔드 스펙에 action enum이 없어, audit() 호출부를 전수 조사해 정리한 값입니다.
// 고정 문자열뿐 아니라 body.decision·body.status를 그대로 넘기는 호출부가 있어
// APPROVED·REJECTED·CALLED 같은 값도 기록됩니다. 백엔드 audit() 호출이 늘면 여기도 맞춰야 합니다.
const ACTION_DESCRIPTIONS: Record<string, string> = {
  LOGIN: "관리자 로그인",
  CREATE: "리소스 생성 (축제, ESG 측정값)",
  UPDATE: "리소스 수정 (대상 유형에 수정된 테이블이 기록돼요)",
  CLONE: "이전 축제 복제",
  TRANSITION: "상태 변경 (예: 티켓 접수→처리중→완료)",
  ASSIGN: "담당자 배정",
  SUBMIT: "입점업체 신청 제출",
  APPROVED: "검수 승인 (참여업체, 콘텐츠, ESG 실적)",
  REJECTED: "검수 반려 (참여업체, 콘텐츠, ESG 실적)",
  PUBLISH: "게시 (콘텐츠, 공지)",
  PUBLISH_EMERGENCY: "긴급 공지 게시",
  UNPUBLISH: "게시 종료",
  CLOSE: "공지 종료",
  CALLED: "예약 호출",
  NO_SHOW: "예약 미방문 처리",
  COMPLETED: "예약 이용 완료",
  GENERATE: "ESG 리포트 생성",
  EXPORT: "데이터 내보내기",
  REVERSE: "쿠폰 사용 취소",
};

// audit() 호출부의 resource_type 고정값. UPDATE만 수정된 테이블명을 그대로 넘겨서 이 목록 밖의 값도 나옵니다.
const RESOURCE_TYPES = [
  "USER", "FESTIVAL", "FESTIVAL_BUSINESS", "COUPON_REDEMPTION", "STAFF_ASSIGNMENT",
  "BOOKING", "ANNOUNCEMENT", "OPS_TICKET", "CONTENT_VERSION", "CONTENT_ITEM",
  "ESG_MEASUREMENT", "ESG_REPORT", "AUDIT_LOG",
];

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

const ALL = "__ALL__";

export default function AuditLogsPage() {
  const currentUser = useAdminSessionStore((s) => s.user);
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [actionInput, setActionInput] = useState(ALL);
  const [resourceTypeInput, setResourceTypeInput] = useState("");
  const [limit, setLimit] = useState(50);

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs", filter, limit],
    queryFn: () => fetchAuditLogs(filter, limit),
  });

  const exportJob = useMutation({ mutationFn: createExport, onSuccess: () => refetch() });
  // 내보내기는 job으로 기록된다. 아직 진행 중일 때만 상태를 다시 확인한다.
  const job = useQuery({
    queryKey: ["export-job", exportJob.data?.jobId],
    queryFn: () => fetchJob(exportJob.data!.jobId),
    enabled: Boolean(exportJob.data?.jobId),
    refetchInterval: (query) => (query.state.data?.status === "COMPLETED" || query.state.data?.status === "FAILED" ? false : 2000),
  });

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLimit(50);
    setFilter({
      action: actionInput === ALL ? undefined : actionInput,
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
          <Label>행위</Label>
          {/* 값을 외워서 타이핑하던 자리 — 고를 수 있는 목록이라 오타로 0건 나오는 일이 없다. */}
          <Select value={actionInput} onValueChange={(value) => setActionInput(String(value))}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {Object.entries(ACTION_DESCRIPTIONS).map(([action, description]) => (
                <SelectItem key={action} value={action}>
                  <span className="font-medium">{action}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-resource-type">대상 유형</Label>
          {/* UPDATE는 수정된 테이블명을 그대로 넘겨서 값이 열려 있다 — 목록은 제안만 하고 직접 입력도 받는다. */}
          <Input
            id="filter-resource-type"
            list="audit-resource-types"
            value={resourceTypeInput}
            onChange={(event) => setResourceTypeInput(event.target.value)}
            placeholder="전체"
            className="w-56"
          />
          <datalist id="audit-resource-types">
            {RESOURCE_TYPES.map((type) => <option key={type} value={type} />)}
          </datalist>
        </div>
        <Button type="submit" size="sm">
          <Search className="size-3.5" />
          조회
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {exportJob.data && (
            <span className="text-[11px] text-muted-foreground">
              작업 {exportJob.data.jobId.slice(0, 8)}… · {job.data?.status ?? exportJob.data.status}
            </span>
          )}
          {exportJob.error && <span className="text-[11px] text-destructive">{queryErrorMessage(exportJob.error)}</span>}
          <Button type="button" size="sm" variant="outline" disabled={exportJob.isPending} onClick={() => exportJob.mutate({ resourceType: "AUDIT_LOG", format: "CSV" })}>
            <Download className="size-3.5" /> CSV 내보내기
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={exportJob.isPending} onClick={() => exportJob.mutate({ resourceType: "AUDIT_LOG", format: "JSON" })}>
            <Download className="size-3.5" /> JSON
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <SkeletonList count={5} className="h-10 w-full" wrapperClassName="p-4" />
        ) : error ? (
          <ErrorState className="m-4" message={queryErrorMessage(error)} onRetry={() => refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState className="m-4 p-10" message="기록된 감사 로그가 없어요." />
        ) : (
          <div className="overflow-x-auto">
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
                    {seoulDateTime(log.createdAt)}
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
          </div>
        )}
      </div>

      {logs.length >= limit && (
        <div className="flex flex-col items-center gap-1.5">
          {limit < AUDIT_LOG_MAX_LIMIT ? (
            // ponytail: 백엔드가 커서를 안 내려줘서 limit 상향이 전부다. 100건 넘게 보려면 audit_logs에 커서 페이징이 필요하다.
            <Button size="sm" variant="outline" onClick={() => setLimit(AUDIT_LOG_MAX_LIMIT)}>
              최근 {AUDIT_LOG_MAX_LIMIT}건까지 더 보기
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              최근 {AUDIT_LOG_MAX_LIMIT}건까지만 볼 수 있어요. 더 필요하면 CSV로 내보내세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
