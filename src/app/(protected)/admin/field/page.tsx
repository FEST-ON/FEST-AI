"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BellRing, CheckCircle2, UserX } from "lucide-react";
import {
  CROWD_LABEL,
  CROWD_LEVELS,
  CROWD_TONE,
  createCrowdSnapshot,
  fetchCrowdSnapshots,
  type CrowdLevel,
  type NewCrowdSnapshot,
} from "@/features/crowd/api/crowd";
import { fetchAdminBookings, updateBookingStatus, type BookingAction } from "@/features/reservation/api/bookings";
import { fetchAreas } from "@/features/map/api/map-locations";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { StatusPill } from "@/shared/ui/status-pill";
import { useForm } from "@/shared/lib/use-form";
import { seoulDateTime, seoulTime } from "@/shared/lib/utils";

const DEFAULT_FORM: NewCrowdSnapshot = { areaId: "", crowdLevel: "MODERATE", peopleCount: null, estimatedWaitMin: null, validMinutes: 30 };

const BOOKING_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "예약 확정", WAITING: "대기 중", CALLED: "호출됨", COMPLETED: "입장 완료", CANCELLED: "취소", NO_SHOW: "미입장",
};

// 예약 상태별로 가능한 다음 조치만 보여준다 — 취소·완료된 건에 버튼이 남아 있으면 오조작이 난다.
const BOOKING_ACTIONS: { status: BookingAction; label: string; icon: typeof BellRing; from: string[] }[] = [
  { status: "CALLED", label: "호출", icon: BellRing, from: ["CONFIRMED", "WAITING"] },
  { status: "COMPLETED", label: "이용 완료", icon: CheckCircle2, from: ["CONFIRMED", "WAITING", "CALLED"] },
  { status: "NO_SHOW", label: "미방문", icon: UserX, from: ["CALLED"] },
];

const BOOKING_FILTERS = ["대기·호출", "완료", "전체"] as const;
type BookingFilter = (typeof BOOKING_FILTERS)[number];

function matchesBooking(status: string, filter: BookingFilter) {
  if (filter === "전체") return true;
  if (filter === "완료") return ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);
  return ["CONFIRMED", "WAITING", "CALLED"].includes(status);
}

export default function FieldOperationsPage() {
  const queryClient = useQueryClient();
  const { form, set, setForm } = useForm<NewCrowdSnapshot>(DEFAULT_FORM);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("대기·호출");

  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });
  const snapshots = useQuery({ queryKey: ["crowd-snapshots"], queryFn: fetchCrowdSnapshots });
  const bookings = useQuery({ queryKey: ["admin-bookings"], queryFn: () => fetchAdminBookings() });

  const submitSnapshot = useMutation({
    mutationFn: createCrowdSnapshot,
    meta: { success: "혼잡도를 기록했어요." },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crowd-snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["public-crowd"] });
      queryClient.invalidateQueries({ queryKey: ["festival-ai-brief"] });
      setForm((previous) => ({ ...DEFAULT_FORM, areaId: previous.areaId }));
    },
  });

  const changeBooking = useMutation({
    mutationFn: updateBookingStatus,
    meta: { success: "예약 상태를 변경했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const visibleBookings = (bookings.data ?? []).filter((row) => matchesBooking(row.status, bookingFilter));

  // 구역별 최신 스냅샷만 현황으로 쓴다 — 목록은 시간 역순이라 첫 등장이 최신이다.
  const latestByArea = new Map<string, NonNullable<typeof snapshots.data>[number]>();
  (snapshots.data ?? []).forEach((row) => {
    if (!latestByArea.has(row.area_id)) latestByArea.set(row.area_id, row);
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        구역별 혼잡도를 직접 등록하고, 대기표를 호출·완료 처리해요. 등록한 혼잡도는 방문객 앱과 운영 위험 브리핑에 바로 반영됩니다.
      </p>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Activity className="size-4 text-primary" /> 혼잡도 등록</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitSnapshot.mutate(form);
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>구역</Label>
            <Select value={form.areaId} onValueChange={(value) => set("areaId")(String(value ?? ""))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="구역 선택" /></SelectTrigger>
              <SelectContent>
                {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>혼잡 수준</Label>
            <Select value={form.crowdLevel} onValueChange={(value) => set("crowdLevel")(value as CrowdLevel)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CROWD_LEVELS.map((level) => <SelectItem key={level} value={level}>{CROWD_LABEL[level]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wait">예상 대기(분)</Label>
            <Input id="wait" type="number" min={0} value={form.estimatedWaitMin ?? ""} onChange={(event) => set("estimatedWaitMin")(event.target.value === "" ? null : Number(event.target.value))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="valid">유효시간(분)</Label>
            <Input id="valid" type="number" min={5} value={form.validMinutes} onChange={(event) => set("validMinutes")(Number(event.target.value))} required />
          </div>
          <div className="sm:col-span-5 flex items-center justify-end gap-3">
            {submitSnapshot.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(submitSnapshot.error)}</p>}
            <Button type="submit" size="sm" disabled={!form.areaId || submitSnapshot.isPending}>
              {submitSnapshot.isPending ? "등록 중..." : "혼잡도 등록"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold text-foreground">구역별 최신 혼잡도</h2>
        <QueryState query={snapshots} empty="등록된 혼잡도가 없어요." emptyWhen={latestByArea.size === 0}>
          {() => (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...latestByArea.values()].map((row) => (
                <div key={row.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{row.area_name}</p>
                    <StatusPill tone={row.stale ? "muted" : CROWD_TONE[row.crowd_level]} className="shrink-0">
                      {CROWD_LABEL[row.crowd_level]}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row.estimated_wait_min !== null ? `예상 대기 ${row.estimated_wait_min}분 · ` : ""}
                    {seoulTime(row.captured_at)} 기준
                    {row.stale && " · 오래된 값"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">예약·대기표 현황</h2>
          <Tabs value={bookingFilter} onValueChange={(value) => setBookingFilter(value as BookingFilter)}>
            <TabsList>
              {BOOKING_FILTERS.map((value) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  {value}
                  <span className="text-[10px] text-muted-foreground">
                    {(bookings.data ?? []).filter((row) => matchesBooking(row.status, value)).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <QueryState query={bookings} empty="표시할 예약이 없어요." emptyWhen={visibleBookings.length === 0}>
          {() => (
            <div className="space-y-2">
              {visibleBookings.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {booking.queue_number ? `${booking.queue_number}번 · ` : ""}{booking.program_title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {seoulDateTime(booking.starts_at)} · {booking.party_size}명
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{BOOKING_STATUS_LABEL[booking.status] ?? booking.status}</Badge>
                    {BOOKING_ACTIONS.filter(({ from }) => from.includes(booking.status)).map(({ status, label, icon: Icon }) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        disabled={changeBooking.isPending && changeBooking.variables?.bookingId === booking.id}
                        onClick={() => changeBooking.mutate({ bookingId: booking.id, status })}
                      >
                        <Icon className="size-3.5" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryState>
        {changeBooking.error && <p className="mt-3 text-sm text-destructive">{queryErrorMessage(changeBooking.error)}</p>}
      </section>
    </div>
  );
}
