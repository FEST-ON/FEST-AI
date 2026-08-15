"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Info, MapPin, Ticket, Users, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { cancelBooking, createBooking, fetchBookableSessions, fetchVisitorBookings, type VisitorBooking } from "@/features/reservation/api/bookings";
import { BOOKING_CANCEL_DEADLINE_MINUTES, BOOKING_NO_SHOW_GRACE_MINUTES } from "@/shared/lib/booking-policy";
import { useAutoTranslate, useTranslation } from "@/shared/lib/i18n";
import type { Dictionary } from "@/shared/lib/i18n";

export default function ReservationPage() {
  const { t, locale, bcp47 } = useTranslation();
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ["visitor-bookings"], queryFn: fetchVisitorBookings });
  const sessions = useQuery({ queryKey: ["bookable-sessions"], queryFn: fetchBookableSessions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["visitor-bookings"] });
  const issue = useMutation({ mutationFn: createBooking, onSuccess: refresh });
  const cancel = useMutation({ mutationFn: cancelBooking, onSuccess: refresh });

  // 프로그램·구역명은 운영자가 등록한 값이라 사전에 없다 — 요청 시점에 자동 번역한다.
  const { translated: text } = useAutoTranslate(
    Object.fromEntries([
      ...(bookings.data ?? []).flatMap((booking) => [
        [`${booking.id}.title`, booking.program_title],
        [`${booking.id}.area`, booking.area_name],
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
      {bookings.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : bookings.isError ?
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">{t.reservation.loadFailed}</p> :
        bookings.data?.length ? <div className="space-y-2.5">{bookings.data.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            title={text[`${booking.id}.title`] ?? booking.program_title}
            areaName={text[`${booking.id}.area`] ?? booking.area_name}
            t={t}
            bcp47={bcp47}
            onCancel={() => cancel.mutate(booking.id)}
          />
        ))}</div> :
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{t.reservation.empty}</div>}
    </section>

    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold text-foreground">{t.reservation.availableProgramTitle}</h2>
      {sessions.isLoading ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> :
        <div className="space-y-2">{sessions.data?.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{text[`${session.id}.title`] ?? session.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(session.startsAt).toLocaleString(bcp47, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {text[`${session.id}.area`] ?? session.areaName}</p></div>
          <Button size="sm" variant="outline" disabled={issue.isPending} onClick={() => issue.mutate(session.id)}><Ticket className="size-3.5" /> {t.reservation.bookButton}</Button>
        </div>)}</div>}
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

    <Badge variant="outline" className="mt-3 w-full justify-center py-2 text-[11px] text-muted-foreground">{t.reservation.autoRefreshNotice}</Badge>
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
      <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-2xl font-extrabold text-primary">{booking.queue_number ? t.reservation.ticketNumber(booking.queue_number) : t.reservation.bookedWithoutNumber}</p></div>
      <div className="flex items-center gap-2"><Badge>{t.reservation.status[booking.status] ?? booking.status}</Badge>{canCancel && <button onClick={onCancel} aria-label={t.reservation.cancelAria} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>}</div>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Users className="size-3.5" /> {t.reservation.partySize(booking.party_size)}</span>
      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {new Date(booking.starts_at).toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit" })}</span>
      <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {areaName}</span>
    </div>
  </article>;
}
