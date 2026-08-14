"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, Ticket, Users, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { cancelBooking, createBooking, fetchBookableSessions, fetchVisitorBookings, type VisitorBooking } from "@/features/reservation/api/bookings";

const STATUS_LABEL: Record<VisitorBooking["status"], string> = {
  CONFIRMED: "예약 확정", WAITING: "대기 중", CALLED: "호출됨", COMPLETED: "입장 완료", CANCELLED: "취소", NO_SHOW: "미입장",
};

export default function ReservationPage() {
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ["visitor-bookings"], queryFn: fetchVisitorBookings });
  const sessions = useQuery({ queryKey: ["bookable-sessions"], queryFn: fetchBookableSessions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["visitor-bookings"] });
  const issue = useMutation({ mutationFn: createBooking, onSuccess: refresh });
  const cancel = useMutation({ mutationFn: cancelBooking, onSuccess: refresh });

  return <div className="px-4 pb-6 pt-4">
    <h1 className="text-lg font-extrabold text-foreground">예약 · 모바일 대기표</h1>
    <p className="text-xs text-muted-foreground">실시간 백엔드 예약 상태와 호출 순서를 확인하세요.</p>

    <section className="mt-4">
      <h2 className="mb-2 text-sm font-bold text-foreground">내 예약</h2>
      {bookings.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : bookings.isError ?
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">예약 정보를 불러오지 못했습니다.</p> :
        bookings.data?.length ? <div className="space-y-2.5">{bookings.data.map((booking) => <BookingCard key={booking.id} booking={booking} onCancel={() => cancel.mutate(booking.id)} />)}</div> :
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">예약 내역이 없어요.</div>}
    </section>

    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold text-foreground">예약 가능한 프로그램</h2>
      {sessions.isLoading ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> :
        <div className="space-y-2">{sessions.data?.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{session.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(session.startsAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {session.areaName}</p></div>
          <Button size="sm" variant="outline" disabled={issue.isPending} onClick={() => issue.mutate(session.id)}><Ticket className="size-3.5" /> 예약</Button>
        </div>)}</div>}
      {issue.isError && <p className="mt-2 text-xs text-destructive">{issue.error instanceof Error ? issue.error.message : "예약에 실패했습니다."}</p>}
    </section>
    <Badge variant="outline" className="mt-6 w-full justify-center py-2 text-[11px] text-muted-foreground">호출 상태는 새로고침 없이 자동 반영됩니다.</Badge>
  </div>;
}

function BookingCard({ booking, onCancel }: { booking: VisitorBooking; onCancel: () => void }) {
  const canCancel = booking.status === "CONFIRMED" || booking.status === "WAITING";
  return <article className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-bold">{booking.program_title}</p><p className="mt-1 text-2xl font-extrabold text-primary">{booking.queue_number ? `${booking.queue_number}번` : "예약 완료"}</p></div>
      <div className="flex items-center gap-2"><Badge>{STATUS_LABEL[booking.status]}</Badge>{canCancel && <button onClick={onCancel} aria-label="예약 취소" className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>}</div>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Users className="size-3.5" /> {booking.party_size}명</span>
      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {new Date(booking.starts_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
      <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {booking.area_name}</span>
    </div>
  </article>;
}
