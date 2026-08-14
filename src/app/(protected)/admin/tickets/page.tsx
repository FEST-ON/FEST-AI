"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Megaphone, MessageSquareWarning, Sparkles } from "lucide-react";
import { fetchTickets, transitionTicket, PRIORITY_STYLE } from "@/entities/ticket";
import type { TicketType } from "@/entities/ticket";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";

const TYPES: (TicketType | "전체")[] = ["전체", "공지", "민원", "사고"];
const TYPE_ICON = { 공지: Megaphone, 민원: MessageSquareWarning, 사고: AlertTriangle } as const;

const STATUS_DOT = { 접수: "bg-slate-400", 배정됨: "bg-primary", 처리중: "bg-amber-500", 해결됨: "bg-teal-500", 완료: "bg-emerald-500" } as const;

export default function TicketsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: transitionTicket,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
  const [type, setType] = useState<(typeof TYPES)[number]>("전체");

  const filtered = useMemo(
    () => (type === "전체" ? (data ?? []) : (data ?? []).filter((t) => t.type === type)),
    [data, type],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        공지·민원·사고를 담당자·상태·우선순위별 티켓으로 관리해요. 상태는 바로 변경할 수 있어요.
      </p>

      <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <ErrorState message={queryErrorMessage(error)} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState message="표시할 티켓이 없어요." />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const Icon = TYPE_ICON[t.type];
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${STATUS_DOT[t.status]}/10`}>
                      <Icon className="size-4 text-foreground/70" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">{t.title}</span>
                        <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>담당자 {t.assignee}</span>
                        <span>{t.category}</span>
                        <span>{t.createdAt}</span>
                      </div>
                      {t.aiTag && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-tint">
                          <Sparkles className="size-3" /> AI 분류: {t.aiTag}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="w-28 shrink-0 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50"
                    onClick={() => mutation.mutate(t)}
                    disabled={mutation.isPending || t.apiStatus === "CLOSED"}
                  >
                    {t.apiStatus === "OPEN" ? "내게 배정" : t.status}
                  </button>
                </div>
              </div>
            );
          })}
          {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
        </div>
      )}
    </div>
  );
}
