"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, Megaphone, Send, ShieldAlert, X } from "lucide-react";
import { callBooking, fetchAdminBookings } from "@/features/reservation";
import { fetchAreas } from "@/features/map/api/map-locations";
import {
  AUDIENCE_OPTIONS,
  SEVERITY_OPTIONS,
  STATUS_LABEL,
  canClose,
  closeAnnouncement,
  fetchAnnouncements,
  publishAnnouncement,
  validatePublishInput,
  type AnnouncementSeverity,
} from "@/entities/announcement";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import { canPublishEmergency } from "@/shared/lib/permissions";
import { EmptyState, ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Button } from "@/shared/ui/button";
import { ConfirmButton } from "@/shared/ui/confirm-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusPill, type Tone } from "@/shared/ui/status-pill";
import { Textarea } from "@/shared/ui/textarea";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal } from "@/shared/lib/utils";

const SEVERITY_TONE: Record<AnnouncementSeverity, Tone> = {
  INFO: "secondary", WARNING: "warning", EMERGENCY: "danger",
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// datetime-local 입력이 브라우저 로컬 시간이므로 표시도 같은 기준으로 맞춘다.
function formatMoment(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

type PublishMode = "now" | "scheduled";

export function NotificationAdminPanel() {
  const queryClient = useQueryClient();
  const role = useAdminSessionStore((state) => state.user?.role);
  const emergencyAllowed = canPublishEmergency(role);

  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => fetchAdminBookings(),
    refetchInterval: 15_000,
  });
  const waitingBookings = bookings.filter((booking) => booking.status === "WAITING");
  const calledBookings = bookings.filter((booking) => booking.status === "CALLED");

  const callMutation = useMutation({
    mutationFn: callBooking,
    meta: { success: "방문객을 호출했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const { data: announcements = [], isLoading: announcementsLoading, error: announcementsError, refetch: refetchAnnouncements } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  });
  const { data: areaOptions = [] } = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });

  const publishMutation = useMutation({
    mutationFn: publishAnnouncement,
    meta: { success: "공지를 발행했어요." },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      reset();
    },
  });
  const closeMutation = useMutation({
    mutationFn: closeAnnouncement,
    meta: { success: "공지 노출을 종료했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const { form, set, field, reset } = useForm(() => ({
    title: "",
    body: "",
    severity: "INFO" as AnnouncementSeverity,
    audience: [] as string[],
    targetAreaIds: [] as string[],
    publishMode: "now" as PublishMode,
    startsAt: datetimeLocal(),
    endsAt: "",
  }));
  const { title, body, severity, audience, targetAreaIds, publishMode, startsAt, endsAt } = form;

  // 즉시 게시는 "발행 버튼을 누른 시각"이 노출 시작이므로 입력값을 검증에서 제외한다.
  const validationError = publishMode === "scheduled"
    ? validatePublishInput({ title, audience, startsAt, endsAt })
    : validatePublishInput({ title, audience, startsAt: datetimeLocal(), endsAt: "" }) ??
      (endsAt && new Date(endsAt) <= new Date() ? "자동 해제 시각은 현재 시각 이후여야 해요." : null);
  const severityBlocked = severity === "EMERGENCY" && !emergencyAllowed;
  const canPublish = !validationError && !severityBlocked && !publishMutation.isPending;

  function publishNotice() {
    if (!canPublish) return;
    publishMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      severity,
      audience,
      targetAreaIds,
      startsAt: publishMode === "now" ? new Date().toISOString() : new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    });
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
          현재 {announcements.filter((item) => canClose(item.status)).length + calledBookings.length}건
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* 방문객 전체로 나가는 되돌릴 수 없는 발행이라, Enter 제출 대신 확인 단계를 반드시 거치게 한다. */}
        <form onSubmit={(event) => event.preventDefault()} className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h3 className="text-sm font-bold">공지사항 발행</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notice-title">공지 제목</Label>
            <Input
              id="notice-title"
              {...field("title")}
              placeholder="예: 메인스테이지 운영 안내"
              maxLength={200}
            />
          </div>

          {/* 예전에는 제목만 보내서 방문객 알림에 본문이 없었고, 화면이 "자세한 내용은 운영
              안내를 확인해 주세요"라는 기본 문구만 보여줬다. */}
          <div className="space-y-1.5">
            <Label htmlFor="notice-body">공지 본문</Label>
            <Textarea
              id="notice-body"
              rows={3}
              {...field("body")}
              placeholder="방문객에게 보일 내용을 적어주세요. 비워두면 제목이 그대로 표시돼요."
              maxLength={4000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>긴급도</Label>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((option) => {
                const blocked = option.value === "EMERGENCY" && !emergencyAllowed;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={severity === option.value ? "default" : "outline"}
                    disabled={blocked}
                    title={blocked ? "긴급 공지는 최고 관리자만 발행할 수 있어요." : undefined}
                    onClick={() => set("severity")(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            {!emergencyAllowed && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldAlert className="size-3" />
                긴급 공지는 최고 관리자 권한이 필요해요. 긴급 상황이면 최고 관리자에게 발행을 요청하세요.
              </p>
            )}
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
                  onClick={() => set("audience")(toggleValue(audience, option.value))}
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
                    onClick={() => set("targetAreaIds")(toggleValue(targetAreaIds, area.id))}
                  >
                    {area.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>게시 방식</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={publishMode === "now" ? "default" : "outline"}
                onClick={() => set("publishMode")("now")}
              >
                <Send className="size-3.5" /> 즉시 게시
              </Button>
              <Button
                type="button"
                size="sm"
                variant={publishMode === "scheduled" ? "default" : "outline"}
                onClick={() => {
                  set("publishMode")("scheduled");
                  // 예약으로 바꾸는 시점의 현재 시각을 기본값으로 다시 채운다(폼을 오래 열어둔 경우 대비).
                  set("startsAt")(datetimeLocal());
                }}
              >
                <CalendarClock className="size-3.5" /> 예약 게시
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {publishMode === "scheduled" && (
              <div className="space-y-1.5">
                <Label htmlFor="notice-starts-at">노출 시작</Label>
                <Input
                  id="notice-starts-at"
                  type="datetime-local"
                  {...field("startsAt")}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="notice-ends-at">자동 해제 시각 (선택)</Label>
              <Input
                id="notice-ends-at"
                type="datetime-local"
                min={publishMode === "scheduled" ? startsAt : undefined}
                {...field("endsAt")}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {publishMode === "now"
              ? "발행 버튼을 누른 시각부터 방문객 화면에 노출돼요."
              : "지정한 시각이 되면 방문객 화면에 노출돼요. 그 전까지는 '노출 예정' 상태로 남아요."}
            {" "}자동 해제 시각을 비워두면 직접 종료할 때까지 노출돼요.
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {validationError && (
              <p className="mr-auto text-xs text-muted-foreground">{validationError}</p>
            )}
            <ConfirmButton
              size="sm"
              disabled={!canPublish}
              title={severity === "EMERGENCY" ? "긴급 공지를 발행할까요?" : "공지를 발행할까요?"}
              description={
                <span className="block space-y-1">
                  <span className="block font-medium text-foreground">{title.trim()}</span>
                  <span className="block">
                    {SEVERITY_OPTIONS.find((option) => option.value === severity)?.label}
                    {" · "}
                    {audience.map((value) => AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value).join(", ")}
                    {" · "}
                    {targetAreaIds.length === 0
                      ? "전체 구역"
                      : targetAreaIds.map((id) => areaOptions.find((area) => area.id === id)?.name ?? id).join(", ")}
                  </span>
                  <span className="block">
                    {formatMoment(startsAt)}부터 {endsAt ? `${formatMoment(endsAt)}까지` : "직접 종료할 때까지"} 노출됩니다.
                  </span>
                  {severity === "EMERGENCY" && (
                    <span className="block text-destructive">대상 방문객 화면 상단에 즉시 고정되고, 되돌리려면 직접 종료해야 해요.</span>
                  )}
                </span>
              }
              confirmLabel="발행"
              onConfirm={publishNotice}
            >
              <Send className="size-3.5" />
              공지 발행
            </ConfirmButton>
          </div>
        </form>

        <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-primary" />
            <h3 className="text-sm font-bold">예약 번호 호출</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            대기 중인 예약을 호출하면 해당 방문객 화면의 알림에 바로 표시돼요.
          </p>
          <div className="space-y-2">
            {bookingsLoading && <p className="text-xs text-muted-foreground">불러오는 중…</p>}
            {bookingsError && <ErrorState message={queryErrorMessage(bookingsError)} onRetry={() => refetchBookings()} />}
            {!bookingsLoading && !bookingsError && waitingBookings.length === 0 && (
              <EmptyState message="호출할 대기 예약이 없어요." />
            )}
            {waitingBookings.map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {booking.queueNumber ? `${booking.queueNumber}번 · ` : ""}{booking.programTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatMoment(booking.startsAt)} · {booking.partySize}명
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={callMutation.isPending}
                  onClick={() => callMutation.mutate(booking.id)}
                >
                  <BellRing className="size-3.5" />
                  호출
                </Button>
              </div>
            ))}
          </div>
          {callMutation.error && <p className="text-xs text-destructive">{callMutation.error.message}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">최근 공지</h3>
          <div className="space-y-2">
            {announcementsLoading && <p className="text-xs text-muted-foreground">불러오는 중…</p>}
            {announcementsError && (
              <ErrorState message={queryErrorMessage(announcementsError)} onRetry={() => refetchAnnouncements()} />
            )}
            {!announcementsLoading && !announcementsError && announcements.length === 0 && (
              <EmptyState message="발행된 공지가 없어요." />
            )}
            {announcements.slice(0, 4).map((announcement) => (
              <div key={announcement.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <StatusPill tone={SEVERITY_TONE[announcement.severity]} className="shrink-0">
                  {SEVERITY_OPTIONS.find((o) => o.value === announcement.severity)?.label}
                </StatusPill>
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
            {calledBookings.length === 0 && <EmptyState message="호출한 예약이 없어요." />}
            {calledBookings.slice(0, 4).map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border p-3">
                <p className="truncate text-sm font-semibold">
                  {booking.queueNumber ? `${booking.queueNumber}번 · ` : ""}{booking.programTitle}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {booking.calledAt ? `${formatMoment(booking.calledAt)} 호출` : "호출됨"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
