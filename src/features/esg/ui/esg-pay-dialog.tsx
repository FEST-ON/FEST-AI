"use client";

import { useEffect, useState } from "react";
import { Clock3, QrCode as QrCodeIcon, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { QrCode } from "@/shared/ui/qr-code";

const PAYMENT_TTL_SECONDS = 30;

function createMockPaymentToken() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ESG-PAY-${Date.now()}-${suffix}`;
}

export function EsgPayDialog() {
  const [open, setOpen] = useState(false);
  const [paymentToken, setPaymentToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const createPayment = () => {
    setPaymentToken(createMockPaymentToken());
    setSecondsLeft(PAYMENT_TTL_SECONDS);
  };

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, secondsLeft]);

  const expired = secondsLeft === 0;

  const close = () => {
    setOpen(false);
    setPaymentToken("");
    setSecondsLeft(0);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}>
      <DialogTrigger
        onClick={createPayment}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-esg-text px-3 text-xs font-bold text-white transition-colors hover:bg-esg-text/90"
      >
        <QrCodeIcon className="size-3.5" /> ESG PAY
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="bg-esg px-5 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="grid size-9 place-items-center rounded-full bg-white/15">
              <QrCodeIcon className="size-5" />
            </span>
            ESG PAY
          </DialogTitle>
          <DialogDescription className="text-white/80">
            현장 결제·포인트 사용을 위한 목업 QR이에요.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5">
          <div className="flex flex-col items-center rounded-2xl border border-esg/30 bg-esg/5 p-4">
            {expired ? (
              <div className="grid size-[190px] place-items-center rounded-xl border border-dashed border-esg/40 bg-muted/40 text-center">
                <div>
                  <p className="text-sm font-extrabold text-muted-foreground">QR 만료</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">새 QR을 생성해 주세요.</p>
                </div>
              </div>
            ) : (
              <QrCode value={paymentToken} size={190} alt="ESG PAY 목업 결제 QR" />
            )}

            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-esg-text" aria-live="polite">
              <Clock3 className="size-3.5" />
              {expired ? "사용 시간이 끝났어요" : `${secondsLeft}초 후 자동 만료`}
            </div>
            <p className="mt-2 break-all text-center font-mono text-[10px] text-muted-foreground">
              {expired ? "ESG PAY QR을 다시 생성해 주세요." : paymentToken}
            </p>
          </div>

          <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">
            실제 결제나 포인트 차감 없이 화면 흐름만 확인하는 목업 기능입니다.
          </p>
        </div>

        <DialogFooter>
          {expired && (
            <Button type="button" onClick={createPayment} className="bg-esg text-white hover:bg-esg/90">
              <RefreshCw className="size-4" /> 새 QR 생성
            </Button>
          )}
          <Button type="button" variant="outline" onClick={close}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
