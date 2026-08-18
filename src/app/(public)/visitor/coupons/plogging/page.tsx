"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, QrCode as QrCodeIcon, Trash2 } from "lucide-react";
import { getReusableVisitorCode } from "@/features/reusable-containers";
import {
  PLOGGING_POINTS_PER_BAG,
  PLOGGING_UPDATED_EVENT,
  ploggingPoints,
  readPloggingSubmissions,
  type PloggingSubmission,
} from "@/features/plogging";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { QrCode } from "@/shared/ui/qr-code";

export default function EsgPloggingPage() {
  const [visitorCode, setVisitorCode] = useState("");
  const [submissions, setSubmissions] = useState<PloggingSubmission[]>([]);

  useEffect(() => {
    const sync = () => {
      setVisitorCode(getReusableVisitorCode());
      setSubmissions(readPloggingSubmissions());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(PLOGGING_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PLOGGING_UPDATED_EVENT, sync);
    };
  }, []);

  const mySubmissions = submissions
    .filter((submission) => submission.visitorCode === visitorCode)
    .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  const earnedPoints = ploggingPoints(mySubmissions);

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader
        title="플로깅 인증"
        description="쓰레기를 주운 뒤 안내원에게 방문객 QR을 보여주면 포인트로 전환돼요."
      />

      <section className="rounded-2xl border border-esg/30 bg-esg/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-esg-text">
          <QrCodeIcon className="size-4" /> 방문객 인증 코드
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-esg/40 bg-background p-5">
          {visitorCode && <QrCode value={visitorCode} size={190} alt="방문객 플로깅 인증 QR" />}
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">내 방문객 코드</p>
            <p className="mt-1 font-mono text-lg font-extrabold tracking-widest text-esg-text">{visitorCode || "코드 생성 중..."}</p>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              주운 쓰레기 봉투 수는 안내원에게 말해주세요. 1봉투당 {PLOGGING_POINTS_PER_BAG}P가 적립돼요.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-esg/10 text-esg-text">
              <Trash2 className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-foreground">인증 내역</h2>
          </div>
        </div>

        {mySubmissions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {mySubmissions.map((submission) => (
              <div key={submission.id} className="flex items-center justify-between gap-3 rounded-xl bg-esg/5 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">쓰레기 {submission.bagCount}봉투 · {submission.location}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(submission.verifiedAt).toLocaleString("ko-KR")}</p>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-esg-text">+{submission.points}P</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">아직 인증 기록이 없어요.</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-esg-text">
          <CheckCircle2 className="size-3.5" /> 누적 인증 {mySubmissions.length}건 · 연계 포인트 {earnedPoints}P
        </p>
      </section>
    </div>
  );
}
