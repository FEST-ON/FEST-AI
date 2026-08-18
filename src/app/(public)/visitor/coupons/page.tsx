"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, History, Recycle, Stamp, Ticket, Trash2 } from "lucide-react";
import { fetchPoints } from "@/entities/coupon";
import {
  REUSABLE_CONTAINER_UPDATED_EVENT,
  getReusableVisitorCode,
  readReusableContainerRentals,
  reusableContainerPoints,
} from "@/features/reusable-containers";

const ESG_ACTIONS = [
  {
    href: "/visitor/coupons/wallet",
    label: "쿠폰",
    description: "내 쿠폰과 혜택",
    icon: Ticket,
  },
  {
    href: "/visitor/stamp-tour",
    label: "스탬프",
    description: "현장 스탬프 투어",
    icon: Stamp,
  },
  {
    href: "/visitor/coupons/reusable",
    label: "대여/반납",
    description: "다회용기 순환 관리",
    icon: Recycle,
  },
  {
    href: "/visitor/coupons/plogging",
    label: "플로깅",
    description: "플로깅 포인트 받기",
    icon: Trash2,
  },
] as const;

export default function EsgPage() {
  const [visitorCode, setVisitorCode] = useState("");
  const [localReusableRentals, setLocalReusableRentals] = useState<
    ReturnType<typeof readReusableContainerRentals>
  >([]);
  const points = useQuery({
    queryKey: ["visitor-points"],
    queryFn: fetchPoints,
  });

  useEffect(() => {
    const sync = () => {
      setVisitorCode(getReusableVisitorCode());
      setLocalReusableRentals(readReusableContainerRentals());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    };
  }, []);

  const visitorRentals = localReusableRentals.filter(
    (rental) => rental.visitorCode === visitorCode,
  );
  const localReusablePoints = reusableContainerPoints(visitorRentals);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      <div>
        <h1 className="text-lg font-extrabold text-foreground">ESG 순환</h1>
        <p className="text-xs text-muted-foreground">
          다회용기와 스탬프로 축제의 좋은 순환에 참여해요.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl bg-esg p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white/80">
              내 ESG 포인트 확인
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">
              {(
                (points.data?.balance ?? 0) + localReusablePoints
              ).toLocaleString()}
              P
            </p>
            <p className="mt-2 text-[11px] leading-4 text-white/80">
              {localReusablePoints > 0
                ? `다회용기 반납으로 +${localReusablePoints}P 적립`
                : "다회용기 반납과 스탬프로 포인트를 모아보세요."}
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
            <Coins className="size-5" />
          </span>
        </div>
        <Link
          href="/visitor/coupons/points"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-esg-text"
        >
          <History className="size-3.5" /> 포인트 적립내역
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-foreground">ESG 기능</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {ESG_ACTIONS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-24 flex-col items-center justify-between rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-esg hover:bg-esg/5"
            >
              <span className="grid size-9 place-items-center rounded-full bg-esg/10 text-esg-text">
                <Icon className="size-4.5" />
              </span>
              <span>
                <span className="block text-xs font-bold text-foreground">
                  {label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-3 text-muted-foreground">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
