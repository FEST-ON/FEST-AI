"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Check, Info, Megaphone } from "lucide-react";
import { useNotificationStore } from "@/features/notification/model/store";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

export function NotificationSheet() {
  const notices = useNotificationStore((state) => state.notices);
  const reservationCalls = useNotificationStore(
    (state) => state.reservationCalls,
  );
  const [readIds, setReadIds] = useState<string[]>([]);

  const notificationIds = [
    ...reservationCalls.map((call) => call.id),
    ...notices.map((notice) => notice.id),
  ];
  const unreadCount = notificationIds.filter(
    (id) => !readIds.includes(id),
  ).length;

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
          <span className="absolute right-2 top-2 size-1 rounded-full bg-destructive" />
        )}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="mx-auto max-h-[78dvh] max-w-md rounded-t-3xl"
      >
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
              <Link
                href="/visitor/reservation"
                className="text-xs font-semibold text-primary"
              >
                예약 내역 보기
              </Link>
            </div>

            {reservationCalls.length > 0 ? (
              <div className="space-y-2">
                {reservationCalls.map((call) => {
                  const isUnread = !readIds.includes(call.id);
                  return (
                    <Link
                      key={call.id}
                      href="/visitor/reservation"
                      onClick={() =>
                        setReadIds((current) => [
                          ...new Set([...current, call.id]),
                        ])
                      }
                      className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 transition hover:bg-primary/10"
                    >
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CalendarClock className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                          {call.ticketNumber}번, 입장할 차례예요
                          {isUnread && (
                            <span className="size-1.5 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {call.program} · {call.location}에서 번호표를
                          보여주세요.
                        </span>
                        <span className="mt-1.5 block text-[11px] font-medium text-primary">
                          {call.createdAt}
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
              {notices.map((notice) => {
                const isUnread = !readIds.includes(notice.id);
                return (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() =>
                      setReadIds((current) => [
                        ...new Set([...current, notice.id]),
                      ])
                    }
                    className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-muted/60"
                  >
                    <span
                      className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                        notice.level === "중요"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <Megaphone className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {notice.title}
                        {isUnread && (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {notice.description}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {notice.createdAt}
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
