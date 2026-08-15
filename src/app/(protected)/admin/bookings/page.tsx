"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, UserCheck, UserX } from "lucide-react";
import {
  fetchAdminBookings,
  updateBookingStatus,
  type BookingAction,
  type AdminBooking,
  type VisitorBooking,
} from "@/features/reservation/api/bookings";
import {
  BOOKING_CANCEL_DEADLINE_MINUTES,
  BOOKING_NO_SHOW_GRACE_MINUTES,
  isNoShowDue,
} from "@/shared/lib/booking-policy";
import { useNow } from "@/shared/lib/use-now";
import { Button } from "@/shared/ui/button";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type StatusFilter = "전체" | VisitorBooking["status"];

const FILTERS: StatusFilter[] = ["전체", "WAITING", "CALLED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

const STATUS_LABEL: Record<string, string> = {
  전체: "전체",
  CONFIRMED: "예약 확정",
  WAITING: "대기 중",
  CALLED: "호출됨",
  COMPLETED: "입장 완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
};

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-primary/10 text-primary dark:bg-primary/25 dark:text-primary-tint",
  WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  CALLED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  NO_SHOW: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatMoment(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("전체");
  // 호출 후 유예 시간이 지난 예약을 계속 다시 계산해야 노쇼 처리 대상이 제때 드러난다.
  const now = useNow(30_000);

  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => fetchAdminBookings(),
    refetchInterval: 15_000,
  });

  const mutate = useMutation({
    mutationFn: updateBookingStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const rows = useMemo(
    () => (bookings.data ?? []).filter((booking) => filter === "전체" || booking.status === filter),
    [bookings.data, filter],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (bookings.data ?? []).forEach((booking) => map.set(booking.status, (map.get(booking.status) ?? 0) + 1));
    return map;
  }, [bookings.data]);

  const overdue = (bookings.data ?? []).filter(
    (booking) => booking.status === "CALLED" && isNoShowDue(booking.called_at, now));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        방문객 예약과 대기 번호를 호출하고, 입장·노쇼를 현장에서 바로 처리해요.
      </p>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground">예약 취소 · 노쇼 정책</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>· 방문객은 시작 {BOOKING_CANCEL_DEADLINE_MINUTES}분 전까지 직접 취소할 수 있어요. 이후 취소는 현장에서 처리해요.</li>
          <li>· 호출 후 {BOOKING_NO_SHOW_GRACE_MINUTES}분이 지나면 노쇼 처리 대상이며, 아래 목록에 따로 표시돼요.</li>
          <li>· 노쇼로 처리하면 대기 순서가 사라지고 방문객 화면에도 같은 문구로 안내돼요.</li>
        </ul>
      </section>

      {overdue.length > 0 && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="size-4 shrink-0" />
          호출 후 {BOOKING_NO_SHOW_GRACE_MINUTES}분이 지난 예약이 {overdue.length}건 있어요. 입장 여부를 확인해 주세요.
        </div>
      )}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
        <TabsList className="flex-wrap">
          {FILTERS.map((value) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {STATUS_LABEL[value]}
              {value !== "전체" && (
                <span className="text-[10px] text-muted-foreground">{counts.get(value) ?? 0}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {bookings.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : bookings.isError ? (
        <ErrorState message={queryErrorMessage(bookings.error)} onRetry={() => bookings.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState message="해당 상태의 예약이 없어요." />
      ) : (
        <div className="space-y-2">
          {rows.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              noShowDue={booking.status === "CALLED" && isNoShowDue(booking.called_at, now)}
              pending={mutate.isPending}
              onUpdate={(status, note) => mutate.mutate({ bookingId: booking.id, status, note })}
            />
          ))}
        </div>
      )}

      {mutate.error && <p className="text-xs text-destructive" role="alert">{mutate.error.message}</p>}
    </div>
  );
}

function BookingRow({
  booking,
  noShowDue,
  pending,
  onUpdate,
}: {
  booking: AdminBooking;
  noShowDue: boolean;
  pending: boolean;
  onUpdate: (status: BookingAction, note: string) => void;
}) {
  return (
    <article
      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${
        noShowDue ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20" : "border-border bg-card"
      }`}
    >
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[booking.status]}`}>
        {STATUS_LABEL[booking.status] ?? booking.status}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {booking.queue_number ? `${booking.queue_number}번 · ` : ""}{booking.program_title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatMoment(booking.starts_at)} · {booking.party_size}명
          {booking.called_at && ` · ${formatMoment(booking.called_at)} 호출`}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {booking.status === "WAITING" && (
          <Button size="sm" disabled={pending} onClick={() => onUpdate("CALLED", "FESTAI 운영 화면에서 호출")}>
            <BellRing className="size-3.5" /> 호출
          </Button>
        )}
        {booking.status === "CALLED" && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onUpdate("COMPLETED", "현장 입장 확인")}>
              <UserCheck className="size-3.5" /> 입장 완료
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                window.confirm(`${booking.program_title} 예약을 노쇼로 처리할까요? 대기 순서가 사라져요.`) &&
                onUpdate("NO_SHOW", `호출 후 ${BOOKING_NO_SHOW_GRACE_MINUTES}분 경과, 현장 미도착`)
              }
            >
              <UserX className="size-3.5" /> 노쇼
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
