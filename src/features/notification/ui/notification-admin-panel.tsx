"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Megaphone, Send, Trash2, X } from "lucide-react";
import { useNotificationStore } from "@/features/notification/model/store";
import {
  AUDIENCE_OPTIONS,
  SEVERITY_OPTIONS,
  STATUS_LABEL,
  canClose,
  closeAnnouncement,
  fetchAnnouncements,
  fetchAreaOptions,
  publishAnnouncement,
  validatePublishInput,
  type AnnouncementSeverity,
} from "@/entities/announcement";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const SEVERITY_STYLE: Record<AnnouncementSeverity, string> = {
  INFO: "bg-secondary text-secondary-foreground",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  EMERGENCY: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// datetime-local 입력이 브라우저 로컬 시간이므로 표시도 같은 기준으로 맞춘다.
function formatMoment(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

export function NotificationAdminPanel() {
  const queryClient = useQueryClient();
  const reservationCalls = useNotificationStore((s) => s.reservationCalls);
  const addReservationCall = useNotificationStore((s) => s.addReservationCall);
  const removeReservationCall = useNotificationStore((s) => s.removeReservationCall);

  const { data: announcements = [], isLoading: announcementsLoading, error: announcementsError } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  });
  const { data: areaOptions = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreaOptions });

  const publishMutation = useMutation({
    mutationFn: publishAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setTitle("");
      setSeverity("INFO");
      setAudience([]);
      setTargetAreaIds([]);
      setEndsAt("");
    },
  });
  const closeMutation = useMutation({
    mutationFn: closeAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<AnnouncementSeverity>("INFO");
  const [audience, setAudience] = useState<string[]>([]);
  const [targetAreaIds, setTargetAreaIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(() => toDatetimeLocal(new Date()));
  const [endsAt, setEndsAt] = useState("");

  const [ticketNumber, setTicketNumber] = useState("");
  const [program, setProgram] = useState("");
  const [location, setLocation] = useState("");

  const validationError = validatePublishInput({ title, audience, startsAt, endsAt });
  const canPublish = !validationError && !publishMutation.isPending;

  function publishNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return;
    publishMutation.mutate({
      title: title.trim(),
      severity,
      audience,
      targetAreaIds,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    });
  }

  function callReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedTicketNumber = Number(ticketNumber);
    if (!Number.isInteger(parsedTicketNumber) || parsedTicketNumber <= 0 || !program.trim()) return;
    addReservationCall({
      ticketNumber: parsedTicketNumber,
      program: program.trim(),
      location: location.trim() || "예약 프로그램 입구",
    });
    setTicketNumber("");
    setProgram("");
    setLocation("");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">방문객 알림 관리</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            발행한 공지는 지정한 대상·구역·시간에만 노출되고, 긴급 공지는 상단에 고정돼요.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          현재 {announcements.filter((item) => canClose(item.status)).length + reservationCalls.length}건
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={publishNotice} className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h3 className="text-sm font-bold">공지사항 발행</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notice-title">공지 내용</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 메인스테이지 운영 안내"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>긴급도</Label>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={severity === option.value ? "default" : "outline"}
                  onClick={() => setSeverity(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>노출 대상 (최소 1개)</Label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={audience.includes(option.value) ? "default" : "outline"}
                  onClick={() => setAudience((current) => toggleValue(current, option.value))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {areaOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>노출 구역 (선택, 비우면 전체 구역)</Label>
              <div className="flex flex-wrap gap-2">
                {areaOptions.map((area) => (
                  <Button
                    key={area.id}
                    type="button"
                    size="sm"
                    variant={targetAreaIds.includes(area.id) ? "default" : "outline"}
                    onClick={() => setTargetAreaIds((current) => toggleValue(current, area.id))}
                  >
                    {area.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="notice-starts-at">노출 시작</Label>
              <Input
                id="notice-starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notice-ends-at">자동 해제 시각 (선택)</Label>
              <Input
                id="notice-ends-at"
                type="datetime-local"
                min={startsAt}
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            비워두면 직접 종료할 때까지 노출돼요. 설정하면 해당 시각 이후 자동으로 노출이 해제돼요.
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {validationError && (
              <p className="mr-auto text-xs text-muted-foreground">{validationError}</p>
            )}
            <Button type="submit" size="sm" disabled={!canPublish}>
              <Send className="size-3.5" />
              공지 발행
            </Button>
          </div>
          {publishMutation.error && (
            <p className="text-xs text-destructive">{publishMutation.error.message}</p>
          )}
        </form>

        <form onSubmit={callReservation} className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-primary" />
            <h3 className="text-sm font-bold">예약 번호 호출</h3>
          </div>
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-number">번호표</Label>
              <Input
                id="ticket-number"
                type="number"
                min={1}
                value={ticketNumber}
                onChange={(event) => setTicketNumber(event.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-program">프로그램</Label>
              <Input
                id="call-program"
                value={program}
                onChange={(event) => setProgram(event.target.value)}
                placeholder="드론라이트쇼 명당석"
                maxLength={60}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="call-location">호출 장소</Label>
            <Input
              id="call-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="미입력 시 예약 프로그램 입구"
              maxLength={60}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={!ticketNumber || !program.trim()}>
              <BellRing className="size-3.5" />
              방문객 호출
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">최근 공지</h3>
          <div className="space-y-2">
            {announcementsLoading && <p className="text-xs text-muted-foreground">불러오는 중…</p>}
            {announcementsError && <p className="text-xs text-destructive">{announcementsError.message}</p>}
            {!announcementsLoading && announcements.length === 0 && (
              <p className="text-xs text-muted-foreground">발행된 공지가 없어요.</p>
            )}
            {announcements.slice(0, 4).map((announcement) => (
              <div key={announcement.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLE[announcement.severity]}`}>
                  {SEVERITY_OPTIONS.find((o) => o.value === announcement.severity)?.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{announcement.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {STATUS_LABEL[announcement.status]}
                    {announcement.startsAt && ` · ${formatMoment(announcement.startsAt)}`}
                    {announcement.endsAt && ` ~ ${formatMoment(announcement.endsAt)}`}
                  </p>
                </div>
                {canClose(announcement.status) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate(announcement.id)}
                    aria-label={`${announcement.title} 공지 종료`}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">최근 예약 호출</h3>
          <div className="space-y-2">
            {reservationCalls.slice(0, 4).map((call) => (
              <div key={call.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{call.ticketNumber}번 · {call.program}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{call.location} · {call.createdAt}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeReservationCall(call.id)}
                  aria-label={`${call.ticketNumber}번 예약 호출 삭제`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
