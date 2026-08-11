"use client";

import { useState } from "react";
import { BellRing, Megaphone, Send, Trash2 } from "lucide-react";
import { useNotificationStore, type NoticeLevel } from "@/features/notification/model/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function NotificationAdminPanel() {
  const notices = useNotificationStore((state) => state.notices);
  const reservationCalls = useNotificationStore((state) => state.reservationCalls);
  const addNotice = useNotificationStore((state) => state.addNotice);
  const addReservationCall = useNotificationStore((state) => state.addReservationCall);
  const removeNotice = useNotificationStore((state) => state.removeNotice);
  const removeReservationCall = useNotificationStore((state) => state.removeReservationCall);

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeDescription, setNoticeDescription] = useState("");
  const [noticeLevel, setNoticeLevel] = useState<NoticeLevel>("일반");
  const [ticketNumber, setTicketNumber] = useState("");
  const [program, setProgram] = useState("");
  const [location, setLocation] = useState("");

  function publishNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noticeTitle.trim() || !noticeDescription.trim()) return;
    addNotice({
      title: noticeTitle.trim(),
      description: noticeDescription.trim(),
      level: noticeLevel,
    });
    setNoticeTitle("");
    setNoticeDescription("");
    setNoticeLevel("일반");
  }

  function callReservation(event: React.FormEvent<HTMLFormElement>) {
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
            발행한 내용은 방문객 화면 오른쪽 위 종 알림에 바로 반영됩니다.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          현재 {notices.length + reservationCalls.length}건
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={publishNotice} className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h3 className="text-sm font-bold">공지사항 발행</h3>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notice-title">제목</Label>
            <Input
              id="notice-title"
              value={noticeTitle}
              onChange={(event) => setNoticeTitle(event.target.value)}
              placeholder="예: 메인스테이지 운영 안내"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notice-description">내용</Label>
            <Textarea
              id="notice-description"
              value={noticeDescription}
              onChange={(event) => setNoticeDescription(event.target.value)}
              placeholder="방문객에게 전달할 내용을 입력하세요."
              maxLength={240}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2" aria-label="공지 중요도">
              {(["일반", "중요"] as NoticeLevel[]).map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={noticeLevel === level ? "default" : "outline"}
                  onClick={() => setNoticeLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
            <Button type="submit" size="sm" disabled={!noticeTitle.trim() || !noticeDescription.trim()}>
              <Send className="size-3.5" />
              공지 발행
            </Button>
          </div>
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
            {notices.slice(0, 4).map((notice) => (
              <div key={notice.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{notice.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{notice.level} · {notice.createdAt}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeNotice(notice.id)}
                  aria-label={`${notice.title} 공지 삭제`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
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

