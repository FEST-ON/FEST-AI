"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Check, Info, Megaphone } from "lucide-react";
import { useReservationStore } from "@/features/reservation/model/store";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

const NOTICES = [
  {
    id: "notice-schedule",
    title: "메인스테이지 공연 시간이 변경됐어요",
    description: "우천으로 인해 그린 콘서트 시작 시간이 19:00으로 변경됐어요.",
    time: "방금 전",
    important: true,
  },
  {
    id: "notice-safety",
    title: "우천 시 안전 이용 안내",
    description: "미끄럼 사고 예방을 위해 강변 산책로 일부 구간을 통제하고 있어요.",
    time: "15분 전",
    important: false,
  },
];

export function NotificationSheet() {
  const tickets = useReservationStore((state) => state.tickets);
  const [readIds, setReadIds] = useState<string[]>([]);

  const calledTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "호출됨"),
    [tickets],
  );
  const notificationIds = [
    ...calledTickets.map((ticket) => `reservation-${ticket.id}`),
    ...NOTICES.map((notice) => notice.id),
  ];
  const unreadCount = notificationIds.filter((id) => !readIds.includes(id)).length;

  function markAllAsRead() {
    setReadIds(notificationIds);
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative rounded-full"
            aria-label={`알림 ${unreadCount}개`}
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="mx-auto max-h-[78dvh] max-w-md rounded-t-3xl">
        <SheetHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-3 pr-9">
            <div>
              <SheetTitle className="text-lg font-bold">알림</SheetTitle>
              <SheetDescription className="mt-1 text-xs">
                공지사항과 예약 호출 내역을 확인하세요.
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="size-3.5" />
                모두 읽음
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto px-4 pb-6">
          <section className="pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">예약 호출</h3>
              <Link href="/visitor/reservation" className="text-xs font-semibold text-primary">
                예약 내역 보기
              </Link>
            </div>

            {calledTickets.length > 0 ? (
              <div className="space-y-2">
                {calledTickets.map((ticket) => {
                  const id = `reservation-${ticket.id}`;
                  const isUnread = !readIds.includes(id);
                  return (
                    <Link
                      key={ticket.id}
                      href="/visitor/reservation"
                      onClick={() => setReadIds((current) => [...new Set([...current, id])])}
                      className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 transition hover:bg-primary/10"
                    >
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CalendarClock className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                          {ticket.number}번, 입장할 차례예요
                          {isUnread && <span className="size-1.5 rounded-full bg-primary" />}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {ticket.program} 입구에서 번호표를 보여주세요.
                        </span>
                        <span className="mt-1.5 block text-[11px] font-medium text-primary">
                          지금 호출됨
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                <Info className="size-4" />
                현재 호출된 예약이 없어요.
              </div>
            )}
          </section>

          <section className="pt-5">
            <h3 className="mb-2 text-sm font-bold text-foreground">공지사항</h3>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {NOTICES.map((notice) => {
                const isUnread = !readIds.includes(notice.id);
                return (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => setReadIds((current) => [...new Set([...current, notice.id])])}
                    className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-muted/60"
                  >
                    <span
                      className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                        notice.important
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <Megaphone className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {notice.title}
                        {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {notice.description}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {notice.time}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
