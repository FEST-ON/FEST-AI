"use client";

import { Ticket, X, Users, Clock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useReservationStore } from "@/features/reservation/model/store";
import { scheduleItems } from "@/entities/festival";

const STATUS_STYLE = {
  대기중:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  호출됨: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  입장완료:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
} as const;

const BOOKABLE_PROGRAMS = scheduleItems.filter(
  (s) => s.category === "체험" || s.category === "행사",
);

export default function ReservationPage() {
  const { tickets, issueTicket, cancelTicket } = useReservationStore();

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">
        예약 · 모바일 대기표
      </h1>
      <p className="text-xs text-muted-foreground">
        줄 서지 않고 모바일로 순서를 확인하세요
      </p>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-foreground">내 대기표</h2>
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            발급받은 대기표가 없어요
          </div>
        ) : (
          <div className="space-y-2.5">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {t.program}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-primary">
                      {t.number}번
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[t.status]}`}
                    >
                      {t.status}
                    </span>
                    <button
                      onClick={() => cancelTicket(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="취소"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> 앞 {t.peopleAhead}팀
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> 예상 {t.estimatedWaitMinutes}
                    분
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-foreground">
          대기표 발급 가능 프로그램
        </h2>
        <div className="space-y-2">
          {BOOKABLE_PROGRAMS.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {p.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.day} {p.time} · {p.stage}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => issueTicket(p.title)}
              >
                <Ticket className="size-3.5" /> 대기표 받기
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Badge
        variant="outline"
        className="mt-6 w-full justify-center py-4 text-[11px] text-muted-foreground"
      >
        입장 시점이 가까워지면 푸시 알림으로 안내드려요
      </Badge>
    </div>
  );
}
