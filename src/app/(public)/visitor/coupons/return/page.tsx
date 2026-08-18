"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCode as QrCodeIcon } from "lucide-react";
import {
  CONTAINER_TYPE_LABEL,
  REUSABLE_CONTAINER_UPDATED_EVENT,
  getReusableVisitorCode,
  readReusableContainerRentals,
} from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { QrCode } from "@/shared/ui/qr-code";

export default function EsgReturnPage() {
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

  const activeRental = rentals.find((rental) => rental.visitorCode === visitorCode && rental.status === "RENTED");

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader title="반납하기" description="현장관리자에게 반납 QR을 보여주면 회수가 완료돼요." />

      <section className="rounded-2xl border border-esg/30 bg-esg/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-esg-text">
          <QrCodeIcon className="size-4" /> 반납 대여 코드
        </div>
        {activeRental ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-esg/40 bg-background p-5">
            <QrCode value={activeRental.rentalCode} size={190} alt="다회용기 반납 QR" />
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">반납 대여 코드</p>
              <p className="mt-1 font-mono text-lg font-extrabold tracking-widest text-esg-text">{activeRental.rentalCode}</p>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {CONTAINER_TYPE_LABEL[activeRental.containerType]} {activeRental.quantity}개 · {activeRental.station}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-5 text-center">
            <p className="text-sm font-semibold text-foreground">현재 대여 중인 용기가 없어요.</p>
            <p className="mt-1 text-[11px] text-muted-foreground">먼저 대여하기에서 방문객 QR을 보여주세요.</p>
            <Link href="/visitor/coupons/rent" className="mt-3 inline-flex rounded-full bg-esg px-3 py-1.5 text-xs font-bold text-white">
              대여 QR 보기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
