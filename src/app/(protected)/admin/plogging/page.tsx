"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Coins, QrCode, ScanLine, Trash2, UserRound } from "lucide-react";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import {
  PLOGGING_OPERATOR_EMAIL,
  PLOGGING_POINTS_PER_BAG,
  PLOGGING_STORAGE_KEY,
  PLOGGING_UPDATED_EVENT,
  createPloggingSubmission,
  ploggingPoints,
  readPloggingSubmissions,
  type PloggingSubmission,
} from "@/features/plogging";
import { isToday } from "@/features/reusable-containers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QrScanner } from "@/shared/ui/qr-scanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatCard } from "@/shared/ui/stat-card";

const LOCATIONS = ["메인 광장 회수존", "푸드존 F-2", "공연장 입구"];

const EMPTY_FORM = {
  visitorCode: "",
  bagCount: 1,
  location: LOCATIONS[0],
};

function formatTime(isoDate: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export default function AdminPloggingPage() {
  const user = useAdminSessionStore((state) => state.user);
  const [submissions, setSubmissions] = useState<PloggingSubmission[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  const isAssignedOperator = user?.email?.toLowerCase() === PLOGGING_OPERATOR_EMAIL;
  const canProcess = isAssignedOperator && user?.role === "FIELD_OPERATOR";

  useEffect(() => {
    const sync = () => setSubmissions(readPloggingSubmissions());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(PLOGGING_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PLOGGING_UPDATED_EVENT, sync);
    };
  }, []);

  const verifiedToday = useMemo(() => submissions.filter((submission) => isToday(submission.verifiedAt)).length, [submissions]);
  const pointsIssued = ploggingPoints(submissions);
  const bagsCollected = submissions.reduce((total, submission) => total + submission.bagCount, 0);

  function save(next: PloggingSubmission[]) {
    window.localStorage.setItem(PLOGGING_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PLOGGING_UPDATED_EVENT));
    setSubmissions(next);
  }

  function submitVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canProcess || !form.visitorCode.trim()) return;
    const submission = createPloggingSubmission({ ...form, operatorEmail: PLOGGING_OPERATOR_EMAIL });
    save([submission, ...submissions]);
    setForm(EMPTY_FORM);
    setNotice(`${submission.submissionCode} 인증 완료 · +${submission.points}P 적립`);
  }

  function handleScan(value: string) {
    const code = value.trim();
    setScannerOpen(false);
    if (!code) return;
    setForm((current) => ({ ...current, visitorCode: code }));
    setNotice("방문객 코드가 입력됐어요. 봉투 수를 확인하고 인증하세요.");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-primary/5 p-5 dark:border-emerald-900/70 dark:from-emerald-950/40 dark:to-primary/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300">
              <Trash2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">플로깅 인증 관리</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                방문객이 주운 쓰레기를 확인하고 인증하면 ESG 포인트가 즉시 적립됩니다.
              </p>
            </div>
          </div>
          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
            <UserRound className="size-3" /> 담당 현장관리자
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-emerald-200/70 pt-3 text-xs dark:border-emerald-900/70">
          <span className="font-semibold text-foreground">{PLOGGING_OPERATOR_EMAIL}</span>
          <span className="text-muted-foreground">FIELD_OPERATOR · 플로깅 인증 처리 담당</span>
          <span className="text-muted-foreground">봉투 1개당 +{PLOGGING_POINTS_PER_BAG}P</span>
        </div>
      </div>

      {!canProcess && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          현재 계정은 조회 전용입니다. 인증 처리는 {PLOGGING_OPERATOR_EMAIL} 계정으로 로그인해 주세요.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="오늘 인증" value={`${verifiedToday}건`} helper="현장 처리 완료" icon={CheckCircle2} tone="success" />
        <StatCard label="누적 인증" value={`${submissions.length}건`} helper="전체 기간" icon={Clock3} tone="warning" />
        <StatCard label="수거 봉투" value={`${bagsCollected}개`} helper="누적 수거량" icon={Trash2} tone="primary" />
        <StatCard label="적립 ESG 포인트" value={`${pointsIssued.toLocaleString()}P`} helper="인증 완료 기준" icon={Coins} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">현장 인증</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">방문객 QR을 확인해 봉투 수를 입력하고 인증하세요.</p>
          </div>
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submitVerification}>
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="visitor-code">방문객 코드</Label>
            <div className="flex gap-2">
              <Input
                id="visitor-code"
                value={form.visitorCode}
                onChange={(event) => setForm((current) => ({ ...current, visitorCode: event.target.value }))}
                placeholder="예: VIS-2048"
                autoComplete="off"
                disabled={!canProcess}
                required
              />
              <Button type="button" size="icon" variant="outline" aria-label="방문객 QR 스캔" disabled={!canProcess} onClick={() => setScannerOpen((value) => !value)}>
                <ScanLine className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bag-count">쓰레기 봉투 수</Label>
            <Input
              id="bag-count"
              type="number"
              min={1}
              max={20}
              value={form.bagCount}
              onChange={(event) => setForm((current) => ({ ...current, bagCount: Number(event.target.value) }))}
              disabled={!canProcess}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>수거 지점</Label>
            <Select value={form.location} onValueChange={(value) => setForm((current) => ({ ...current, location: String(value ?? LOCATIONS[0]) }))}>
              <SelectTrigger className="w-full" disabled={!canProcess}><SelectValue /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end">
            <Button type="submit" className="w-full" disabled={!canProcess || !form.visitorCode.trim()}>
              <CheckCircle2 className="size-4" /> 인증 완료
            </Button>
          </div>
        </form>

        {scannerOpen && (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
            <QrScanner label="방문객 QR 스캔" onScan={handleScan} />
            <p className="mt-2 text-[11px] text-muted-foreground">카메라를 사용할 수 없으면 위 입력란에 직접 코드를 입력할 수 있어요.</p>
          </div>
        )}
        {notice && <p className="mt-3 text-xs font-medium text-primary" role="status">{notice}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">최근 인증 활동</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">(데모: localStorage) 인증 완료 내역은 이 기기/브라우저에서만 즉시 반영됩니다.</p>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]"><QrCode className="size-3" /> TRASH_PICKUP</Badge>
        </div>
        {submissions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <Trash2 className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">아직 인증한 건이 없어요.</p>
            <p className="mt-1 text-xs text-muted-foreground">위에서 방문객 코드를 입력해 첫 인증을 등록하세요.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {submissions.slice(0, 8).map((submission) => (
              <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{submission.submissionCode} · {submission.visitorCode}</p>
                    <p className="truncate text-[11px] text-muted-foreground">쓰레기 {submission.bagCount}봉투 · {submission.location} · {formatTime(submission.verifiedAt)}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">+{submission.points}P 적립</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-foreground">프론트 연계 흐름</p>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="flex gap-2"><ScanLine className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">1. 스캔</b><br />방문객 QR을 스캔하거나 코드를 입력합니다.</span></div>
          <div className="flex gap-2"><Trash2 className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">2. 확인</b><br />수거한 쓰레기 봉투 수를 입력합니다.</span></div>
          <div className="flex gap-2"><Coins className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">3. 적립</b><br />(데모: 이 기기 기준) 인증 완료 즉시 봉투당 +{PLOGGING_POINTS_PER_BAG}P를 기록합니다.</span></div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">현재는 프론트엔드 전용 데모 저장소(localStorage)라 인증 내역이 기기/브라우저 간 동기화되지 않습니다. 실제 서버 저장·중복 방지는 백엔드 API 연결 시 교체할 수 있습니다.</p>
      </section>
    </div>
  );
}
