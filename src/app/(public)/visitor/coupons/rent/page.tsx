"use client";

import { useEffect, useState } from "react";
import { QrCode as QrCodeIcon } from "lucide-react";
import { getReusableVisitorCode } from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { QrCode } from "@/shared/ui/qr-code";

export default function EsgRentPage() {
  const [visitorCode, setVisitorCode] = useState("");

  useEffect(() => {
    setVisitorCode(getReusableVisitorCode());
  }, []);

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader title="대여하기" description="현장관리자에게 방문객 QR을 보여주고 다회용기를 대여하세요." />

      <section className="rounded-2xl border border-esg/30 bg-esg/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-esg-text">
          <QrCodeIcon className="size-4" /> 방문객 대여 코드
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-esg/40 bg-background p-5">
          {visitorCode && <QrCode value={visitorCode} size={190} alt="방문객 대여 코드 QR" />}
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">내 방문객 코드</p>
            <p className="mt-1 font-mono text-lg font-extrabold tracking-widest text-esg-text">{visitorCode || "코드 생성 중..."}</p>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">용기 종류와 수량은 현장관리자에게 말해주세요.</p>
          </div>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
        대여가 등록되면 <strong className="text-foreground">대여 현황</strong>에서 용기 상태를 확인할 수 있어요.
      </div>
    </div>
  );
}
