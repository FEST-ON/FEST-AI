"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ALargeSmall, Camera } from "lucide-react";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useTranslation } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui/button";
import { fetchKioskCameraEnabled, recordKioskAssist } from "../api/kiosk-assist";
import { AGE_MODEL_VERSION, estimateAgeBand } from "../model/estimate-age";

/**
 * 키오스크 앞에 아무 조작이 없다가 다시 눌리면 다른 사람이 왔다고 본다.
 * 로그인이 없는 키오스크에서 "세션당 1회"를 판정할 수 있는 유일한 단서다.
 * ponytail: 90초 고정. 현장에서 짧거나 길면 상수만 고친다.
 */
const IDLE_RESET_MS = 90_000;

/** 이용 흐름 번호. 조작이 끊겼다 다시 시작되면 올라가고, 제안은 흐름당 한 번만 뜬다. */
function useKioskFlow(): number {
  const [flow, setFlow] = useState(0);
  const lastActivity = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity.current > IDLE_RESET_MS) setFlow((value) => value + 1);
      lastActivity.current = now;
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  return flow;
}

type Phase = "consent" | "checking" | "suggest" | "done";

/**
 * KIOSK-A11Y-01: 카메라로 연령대를 추정해 큰 글씨 모드를 "제안"한다.
 *
 * 강제 전환은 없다. 카메라 미지원·동의 거부·추정 실패는 모두 조용히 일반 화면으로 흐르고,
 * 큰 글씨·음성 안내는 하단 설정 바에서 언제든 직접 켤 수 있다(KioskSettingsBar).
 * 운영자가 카메라 제안을 중지하면(ESG-G-08) 이 컴포넌트는 아무것도 그리지 않는다.
 */
export function KioskLargeTextPrompt() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const flow = useKioskFlow();
  const largeText = useAccessibilityStore((state) => state.largeText);
  const toggleLargeText = useAccessibilityStore((state) => state.toggleLargeText);
  // 흐름이 바뀌면 제안 기회도 새로 연다. 흐름 번호를 상태에 같이 담아 렌더 중에 판정한다 —
  // 효과에서 setState로 되돌리면 한 번 더 그린 뒤에야 카드가 살아난다.
  const [phaseState, setPhaseState] = useState<{ flow: number; phase: Phase }>({ flow: 0, phase: "consent" });
  const phase = phaseState.flow === flow ? phaseState.phase : "consent";
  const setPhase = useCallback((next: Phase) => setPhaseState({ flow, phase: next }), [flow]);
  // 켜져 있는 키오스크는 새로고침되지 않으므로, 중지 스위치가 1분 안에 닿도록 주기적으로 다시 확인한다.
  const cameraQuery = useQuery({
    queryKey: ["kiosk-camera-enabled"],
    queryFn: fetchKioskCameraEnabled,
    refetchInterval: 60_000,
  });
  const enabled = cameraQuery.data === true;

  // 흐름당 한 번, 방문객이 실제로 안내 화면까지 갔는지만 남긴다(완료율의 분자).
  const completed = useRef(-1);
  useEffect(() => {
    if (!enabled || pathname === "/visitor" || completed.current === flow) return;
    completed.current = flow;
    void recordKioskAssist("TASK_COMPLETED");
  }, [enabled, flow, pathname]);

  const shown = useRef(-1);
  useEffect(() => {
    if (phase !== "consent" || !enabled || largeText || shown.current === flow) return;
    shown.current = flow;
    void recordKioskAssist("CONSENT_SHOWN", AGE_MODEL_VERSION);
  }, [enabled, flow, largeText, phase]);

  const decline = useCallback(() => {
    setPhase("done");
    void recordKioskAssist("CONSENT_DECLINED");
  }, [setPhase]);

  const check = useCallback(async () => {
    setPhase("checking");
    void recordKioskAssist("CONSENT_GRANTED", AGE_MODEL_VERSION);
    const result = await estimateAgeBand();
    if (result.status === "senior") {
      setPhase("suggest");
      void recordKioskAssist("SUGGESTED", AGE_MODEL_VERSION);
      return;
    }
    // 미검출·저신뢰도는 제안하지 않는다. 화면은 그대로 두고 끝낸다.
    setPhase("done");
    if (result.status === "unavailable") void recordKioskAssist("ESTIMATE_FAILED", AGE_MODEL_VERSION);
  }, [setPhase]);

  const accept = useCallback(() => {
    setPhase("done");
    if (!useAccessibilityStore.getState().largeText) toggleLargeText();
    void recordKioskAssist("ACCEPTED", AGE_MODEL_VERSION);
  }, [setPhase, toggleLargeText]);

  const dismiss = useCallback(() => {
    setPhase("done");
    void recordKioskAssist("DISMISSED", AGE_MODEL_VERSION);
  }, [setPhase]);

  // 이미 큰 글씨로 보고 있으면 제안할 것이 없다.
  if (!enabled || largeText || phase === "done") return null;

  const copy = t.kioskAssist;
  // 화면을 가로막지 않는다 — 제안을 무시하고 그냥 안내를 이어가는 것이 정상 경로여야 한다.
  return (
    <section
      aria-live="polite"
      className="mx-auto w-full max-w-md shrink-0 border-t border-border bg-card px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      {phase === "suggest" ? (
        <>
          <h2 className="text-base font-bold text-foreground">{copy.suggestTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.suggestDescription}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="lg" className="min-h-14 text-base font-bold" onClick={accept}>
              <ALargeSmall className="size-5" />
              {copy.suggestAccept}
            </Button>
            <Button size="lg" variant="outline" className="min-h-14 text-base" onClick={dismiss}>
              {copy.suggestDecline}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-base font-bold text-foreground">{copy.consentTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.consentDescription}</p>
          {/* 처리 원칙을 동의 화면에서 그대로 보여 준다(ESG-G-08 공개 안내). */}
          <ul className="mt-2 list-disc space-y-0.5 rounded-lg bg-muted/60 py-2 pr-3 pl-6 text-xs text-muted-foreground">
            <li>{copy.noticeOnDevice}</li>
            <li>{copy.noticeDiscard}</li>
            <li>{copy.noticeNoIdentity}</li>
            <li>{copy.noticeOptional}</li>
          </ul>
          <div className="mt-3 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="min-h-14 text-base font-bold"
                disabled={phase === "checking"}
                onClick={() => void check()}
              >
                <Camera className="size-5" />
                {phase === "checking" ? copy.checking : copy.consentAccept}
              </Button>
              {/* 카메라를 쓰지 않고도 지금 바로 큰 글씨로 갈 수 있는 길을 같은 자리에 둔다. */}
              <Button
                size="lg"
                variant="outline"
                className="min-h-14 text-base font-semibold"
                disabled={phase === "checking"}
                onClick={() => {
                  toggleLargeText();
                  setPhase("done");
                  void recordKioskAssist("MANUAL_LARGE_TEXT");
                }}
              >
                <ALargeSmall className="size-5" />
                {copy.manualLargeText}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11 text-sm"
              disabled={phase === "checking"}
              onClick={decline}
            >
              {copy.consentDecline}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
