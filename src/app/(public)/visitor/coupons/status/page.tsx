"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck } from "lucide-react";
import {
  CONTAINER_TYPE_LABEL,
  REUSABLE_CONTAINER_UPDATED_EVENT,
  getReusableVisitorCode,
  readReusableContainerRentals,
  reusableContainerPoints,
} from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { Badge } from "@/shared/ui/badge";

export default function EsgStatusPage() {
  const [visitorCode, setVisitorCode] = useState("");
  const [rentals, setRentals] = useState<ReturnType<typeof readReusableContainerRentals>>([]);

  useEffect(() => {
    const sync = () => {
      setVisitorCode(getReusableVisitorCode());
      setRentals(readReusableContainerRentals());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    };
  }, []);

  const visitorRentals = rentals.filter((rental) => rental.visitorCode === visitorCode);
  const activeRental = visitorRentals.find((rental) => rental.status === "RENTED");
  const returnedRentals = visitorRentals.filter((rental) => rental.status === "RETURNED");
  const earnedPoints = reusableContainerPoints(visitorRentals);

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader title="대여 현황" description="내 방문객 코드에 연결된 다회용기 상태예요." />

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-esg/10 text-esg-text">
              <PackageCheck className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-foreground">현재 대여 상태</h2>
          </div>
          <Badge variant={activeRental ? "default" : "outline"} className="text-[10px]">
            {activeRental ? "대여 중" : "대여 없음"}
          </Badge>
        </div>

        {activeRental ? (
          <div className="mt-4 rounded-xl bg-esg/5 p-3">
            <p className="text-sm font-bold text-foreground">{CONTAINER_TYPE_LABEL[activeRental.containerType]} {activeRental.quantity}개</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{activeRental.rentalCode} · {activeRental.station}</p>
            <Link href="/visitor/coupons/return" className="mt-3 inline-flex rounded-full bg-esg px-3 py-1.5 text-xs font-bold text-white">
              반납 QR 보기
            </Link>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-muted/40 p-4 text-center">
            <Clock3 className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">대여 없음</p>
            <p className="mt-1 text-[11px] text-muted-foreground">대여가 등록되면 여기에 현황이 표시됩니다.</p>
            <Link href="/visitor/coupons/rent" className="mt-3 inline-flex rounded-full border border-esg/40 px-3 py-1.5 text-xs font-bold text-esg-text">
              대여 QR 보기
            </Link>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground">반납 기록</h2>
        {returnedRentals.length > 0 ? (
          <div className="mt-3 space-y-2">
            {returnedRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between gap-3 rounded-xl bg-esg/5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{CONTAINER_TYPE_LABEL[rental.containerType]} {rental.quantity}개</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{rental.station} · {rental.returnedAt ? new Date(rental.returnedAt).toLocaleString("ko-KR") : "반납 완료"}</p>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-esg-text">+{rental.stampPoints}P</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">아직 반납 기록이 없어요.</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-esg-text">
          <CheckCircle2 className="size-3.5" /> 누적 반납 {returnedRentals.length}건 · 연계 포인트 {earnedPoints}P
        </p>
      </section>
    </div>
  );
}
