"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, PackageCheck } from "lucide-react";
import {
  CONTAINER_TYPE_LABEL,
  REUSABLE_CONTAINER_UPDATED_EVENT,
  getReusableVisitorCode,
  readReusableContainerRentals,
} from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { Badge } from "@/shared/ui/badge";

const ACTIONS = [
  {
    href: "/visitor/coupons/rent",
    label: "대여하기",
    description: "방문객 QR을 보여주세요",
    icon: ArrowUpRight,
  },
  {
    href: "/visitor/coupons/return",
    label: "반납하기",
    description: "반납용 QR을 보여주세요",
    icon: ArrowDownLeft,
  },
] as const;

export default function ReusableContainerPage() {
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
      <VisitorEsgHeader title="대여/반납" description="다회용기 대여부터 반납까지 한 곳에서 관리하세요." />

      <section className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-32 flex-col justify-between rounded-2xl border border-esg/30 bg-esg/5 p-4 transition-colors hover:bg-esg/10">
            <span className="grid size-10 place-items-center rounded-full bg-esg text-white"><Icon className="size-5" /></span>
            <span>
              <span className="block text-sm font-bold text-foreground">{label}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{description}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-esg/10 text-esg-text"><PackageCheck className="size-4" /></span>
            <h2 className="text-sm font-bold text-foreground">대여 현황</h2>
          </div>
          <Badge variant={activeRental ? "default" : "outline"} className="text-[10px]">{activeRental ? "대여 중" : "대여 없음"}</Badge>
        </div>
        {activeRental ? (
          <div className="mt-3 rounded-xl bg-esg/5 p-3">
            <p className="text-sm font-bold text-foreground">{CONTAINER_TYPE_LABEL[activeRental.containerType]} {activeRental.quantity}개</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{activeRental.rentalCode} · {activeRental.station}</p>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">대여가 등록되면 여기에 현황이 표시됩니다.</p>
        )}
        <Link href="/visitor/coupons/status" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-esg-text">
          자세히 보기 <ArrowLeft className="size-3 rotate-180" />
        </Link>
      </section>
    </div>
  );
}
