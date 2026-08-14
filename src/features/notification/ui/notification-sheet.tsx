"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Check, Info, Megaphone } from "lucide-react";
import { announcementText, fetchAnnouncements, fetchCalledBookings } from "@/features/notification/api/notifications";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

export function NotificationSheet() {
  const notices = useQuery({ queryKey: ["public-announcements"], queryFn: fetchAnnouncements, refetchInterval: 30_000 });
  const calls = useQuery({ queryKey: ["called-bookings"], queryFn: fetchCalledBookings, refetchInterval: 10_000 });
  const [readIds, setReadIds] = useState<string[]>([]);
  const notificationIds = [...(calls.data ?? []).map((item) => item.id), ...(notices.data ?? []).map((item) => item.id)];
  const unreadCount = notificationIds.filter((id) => !readIds.includes(id)).length;
  const markRead = (id: string) => setReadIds((current) => [...new Set([...current, id])]);

  return <Sheet>
    <SheetTrigger render={<Button variant="outline" size="icon" className="relative rounded-full" aria-label={`알림 ${unreadCount}개`} />}>
      <Bell className="size-4" />{unreadCount > 0 && <span className="absolute right-2 top-2 size-1 rounded-full bg-destructive" />}
    </SheetTrigger>
    <SheetContent side="bottom" className="mx-auto max-h-[78dvh] max-w-md rounded-t-3xl">
      <SheetHeader className="border-b border-border pb-3"><div className="flex items-center justify-between gap-3 pr-9"><div><SheetTitle className="text-lg font-bold">알림</SheetTitle><SheetDescription className="mt-1 text-xs">공지사항과 실시간 예약 호출 내역입니다.</SheetDescription></div>{unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => setReadIds(notificationIds)}><Check className="size-3.5" />모두 읽음</Button>}</div></SheetHeader>
      <div className="overflow-y-auto px-4 pb-6">
        <section className="pt-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">예약 호출</h3><Link href="/visitor/reservation" className="text-xs font-semibold text-primary">예약 내역 보기</Link></div>
          {calls.data?.length ? <div className="space-y-2">{calls.data.map((call) => <Link key={call.id} href="/visitor/reservation" onClick={() => markRead(call.id)} className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3"><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><CalendarClock className="size-4" /></span><span><span className="text-sm font-bold">{call.queue_number ?? "예약"}번, 입장할 차례예요</span><span className="mt-1 block text-xs text-muted-foreground">{call.program_title} · {call.area_name}</span>{call.called_at && <span className="mt-1.5 block text-[11px] font-medium text-primary">{new Date(call.called_at).toLocaleString("ko-KR")}</span>}</span></Link>)}</div> : <div className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-xs text-muted-foreground"><Info className="size-4" />현재 호출된 예약이 없어요.</div>}
        </section>
        <section className="pt-5"><h3 className="mb-2 text-sm font-bold">공지사항</h3><div className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
          {notices.data?.map((notice) => <button key={notice.id} type="button" onClick={() => markRead(notice.id)} className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/60"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${notice.severity === "INFO" ? "bg-secondary" : "bg-destructive/10 text-destructive"}`}><Megaphone className="size-4" /></span><span><span className="text-sm font-semibold">{notice.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{announcementText(notice.body)}</span><span className="mt-1 block text-[11px] text-muted-foreground">{new Date(notice.updated_at).toLocaleString("ko-KR")}</span></span></button>)}
          {!notices.isLoading && !notices.data?.length && <p className="p-4 text-xs text-muted-foreground">현재 게시된 공지가 없어요.</p>}
        </div></section>
      </div>
    </SheetContent>
  </Sheet>;
}
