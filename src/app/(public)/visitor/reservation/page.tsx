"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Info, MapPin, Ticket, Users, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useWrite } from "@/shared/lib/use-write";
import { Badge } from "@/shared/ui/badge";
import { QueryState } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { cancelBooking, createBooking, fetchBookableSessions, fetchVisitorBookings, MAX_PARTY_SIZE, type VisitorBooking } from "@/features/reservation";
import { BOOKING_CANCEL_DEADLINE_MINUTES, BOOKING_NO_SHOW_GRACE_MINUTES } from "@/shared/lib/booking-policy";
import { useAutoTranslate, useTranslation } from "@/shared/lib/i18n";
import type { Dictionary } from "@/shared/lib/i18n";

export default function ReservationPage() {
  const { t, locale, bcp47 } = useTranslation();
  const bookings = useQuery({ queryKey: ["visitor-bookings"], queryFn: fetchVisitorBookings });
  const sessions = useQuery({ queryKey: ["bookable-sessions"], queryFn: fetchBookableSessions });
  const issue = useWrite(createBooking, { invalidates: ["visitor-bookings"] });
  // 예약 인원은 정원 계산에 그대로 들어간다. 예전에는 화면이 항상 1명으로 고정해 보냈다.
  const [partySizes, setPartySizes] = useState<Record<string, number>>({});
  const cancel = useWrite(cancelBooking, { invalidates: ["visitor-bookings"] });

  // 프로그램·구역명은 운영자가 등록한 값이라 사전에 없다 — 요청 시점에 자동 번역한다.
  const { translated: text } = useAutoTranslate(
    Object.fromEntries([
      ...(bookings.data ?? []).flatMap((booking) => [
        [`${booking.id}.title`, booking.programTitle],
        [`${booking.id}.area`, booking.areaName],
      ]),
      ...(sessions.data ?? []).flatMap((session) => [
        [`${session.id}.title`, session.title],
        [`${session.id}.area`, session.areaName],
      ]),
    ]),
    locale,
  );

  return <div className="px-4 pb-6 pt-4">
    <h1 className="text-lg font-extrabold text-foreground">{t.reservation.title}</h1>
    <p className="text-xs text-muted-foreground">{t.reservation.subtitle}</p>

    <section className="mt-4">
      <h2 className="mb-2 text-sm font-bold text-foreground">{t.reservation.myBookingsTitle}</h2>
      <QueryState
        query={bookings}
        empty={t.reservation.empty}
        errorMessage={t.reservation.loadFailed}
        retryLabel={t.common.retry}
        skeleton={<Skeleton className="h-28 rounded-2xl" />}
      >
        {(rows) => (
          <div className="space-y-2.5">
            {rows.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                title={text[`${booking.id}.title`] ?? booking.programTitle}
                areaName={text[`${booking.id}.area`] ?? booking.areaName}
                t={t}
                bcp47={bcp47}
                onCancel={() => cancel.mutate(booking.id)}
              />
            ))}
          </div>
        )}
      </QueryState>
    </section>

    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold text-foreground">{t.reservation.availableProgramTitle}</h2>
      <QueryState
        query={sessions}
        empty={t.common.empty}
        errorMessage={t.common.loadFailed}
        retryLabel={t.common.retry}
        skeleton={<SkeletonList count={2} className="h-20" />}
      >
        {(rows) => (
          <div className="space-y-2">
            {rows.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{text[`${session.id}.title`] ?? session.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(session.startsAt).toLocaleString(bcp47, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{text[`${session.id}.area`] ?? session.areaName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <select
                    aria-label={t.reservation.partySize(partySizes[session.id] ?? 1)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs font-medium text-foreground"
                    value={partySizes[session.id] ?? 1}
                    onChange={(event) => setPartySizes({ ...partySizes, [session.id]: Number(event.target.value) })}
                  >
                    {Array.from({ length: MAX_PARTY_SIZE }, (_, index) => index + 1).map((size) => (
                      <option key={size} value={size}>{t.reservation.partySize(size)}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" disabled={issue.isPending}
                          onClick={() => issue.mutate({ sessionId: session.id, partySize: partySizes[session.id] ?? 1 })}>
                    <Ticket className="size-3.5" /> {t.reservation.bookButton}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
      {issue.isError && <p className="mt-2 text-xs text-destructive">{issue.error instanceof Error ? issue.error.message : t.reservation.bookFailed}</p>}
    </section>
    <section className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Info className="size-4" /> {t.reservation.policyTitle}</h2>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
        <li>· {t.reservation.policyCancel(BOOKING_CANCEL_DEADLINE_MINUTES)}</li>
        <li>· {t.reservation.policyNoShow(BOOKING_NO_SHOW_GRACE_MINUTES)}</li>
        <li>· {t.reservation.policyRepeat}</li>
      </ul>
    </section>

    <Badge variant="outline" className="mt-3 w-full justify-center py-2 text-[0.6875rem] text-muted-foreground">{t.reservation.autoRefreshNotice}</Badge>
  </div>;
}

function BookingCard({ booking, title, areaName, t, bcp47, onCancel }: {
  booking: VisitorBooking;
  title: string;
  areaName: string;
  t: Dictionary;
  bcp47: string;
  onCancel: () => void;
}) {
  const canCancel = booking.status === "CONFIRMED" || booking.status === "WAITING";
  return <article className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-2xl font-extrabold text-primary">{booking.queueNumber ? t.reservation.ticketNumber(booking.queueNumber) : t.reservation.bookedWithoutNumber}</p></div>
      <div className="flex items-center gap-2"><Badge>{t.reservation.status[booking.status] ?? booking.status}</Badge>{canCancel && <button onClick={onCancel} aria-label={t.reservation.cancelAria} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>}</div>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Users className="size-3.5" /> {t.reservation.partySize(booking.partySize)}</span>
      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {new Date(booking.startsAt).toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit" })}</span>
      <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {areaName}</span>
    </div>
  </article>;
}
