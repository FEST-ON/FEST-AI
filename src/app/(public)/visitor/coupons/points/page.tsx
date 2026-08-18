"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, History } from "lucide-react";
import { fetchPoints } from "@/entities/coupon";
import {
  REUSABLE_CONTAINER_UPDATED_EVENT,
  getReusableVisitorCode,
  readReusableContainerRentals,
  reusableContainerPoints,
} from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";

export default function EsgPointsPage() {
  const [visitorCode, setVisitorCode] = useState("");
  const [rentals, setRentals] = useState<ReturnType<typeof readReusableContainerRentals>>([]);
  const { data, isLoading } = useQuery({ queryKey: ["visitor-points"], queryFn: fetchPoints });

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

  const returnedRentals = rentals.filter((rental) => rental.visitorCode === visitorCode && rental.status === "RETURNED");
  const localPoints = reusableContainerPoints(returnedRentals);
  const history = useMemo(
    () => [
      ...returnedRentals.map((rental) => ({
        id: `local-${rental.id}`,
        reason: `다회용기 반납 · ${rental.rentalCode}`,
        pointsDelta: rental.stampPoints,
        createdAt: rental.returnedAt ?? rental.rentedAt,
      })),
      ...(data?.ledger ?? []),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data?.ledger, returnedRentals],
  );

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader title="포인트 적립내역" description="ESG 행동과 다회용기 반납으로 쌓인 포인트예요." />

      <section className="rounded-2xl bg-esg p-5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-full bg-white/15"><Coins className="size-5" /></span>
          <div>
            <p className="text-xs font-bold text-white/80">내 ESG 포인트</p>
            <p className="text-2xl font-extrabold">{((data?.balance ?? 0) + localPoints).toLocaleString()}P</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-esg-text" />
          <h2 className="text-sm font-bold text-foreground">최근 적립내역</h2>
        </div>
        {isLoading ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">내역을 불러오는 중이에요.</p>
        ) : history.length === 0 ? (
          <p className="mt-4 rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">아직 적립내역이 없어요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{entry.reason}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString("ko-KR")}</p>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-esg-text">+{entry.pointsDelta}P</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
