"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, Coins, QrCode, Recycle, ScanLine, UserRound } from "lucide-react";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import {
  CONTAINER_TYPE_LABEL,
  REUSABLE_CONTAINER_STORAGE_KEY,
  REUSABLE_CONTAINER_UPDATED_EVENT,
  REUSABLE_OPERATOR_EMAIL,
  REUSABLE_STAMP_POINTS,
  completeContainerReturn,
  createContainerRental,
  isToday,
  readReusableContainerRentals,
  reusableContainerPoints,
  type ContainerRental,
  type ContainerType,
} from "@/features/reusable-containers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QrScanner } from "@/shared/ui/qr-scanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatCard } from "@/shared/ui/stat-card";
import { StatusPill } from "@/shared/ui/status-pill";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type FlowMode = "RENT" | "RETURN";

const STATIONS = ["메인 광장 회수존", "푸드존 F-2", "공연장 입구"];

const EMPTY_RENT_FORM = {
  visitorCode: "",
  containerType: "CUP" as ContainerType,
  quantity: 1,
  station: STATIONS[0],
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

export default function ReusableContainersPage() {
  const user = useAdminSessionStore((state) => state.user);
  const [rentals, setRentals] = useState<ContainerRental[]>([]);
  const [mode, setMode] = useState<FlowMode>("RENT");
  const [rentalForm, setRentalForm] = useState(EMPTY_RENT_FORM);
  const [returnRentalId, setReturnRentalId] = useState("");
  const [scannerMode, setScannerMode] = useState<FlowMode | null>(null);
  const [notice, setNotice] = useState<string>();

  const isAssignedOperator = user?.email?.toLowerCase() === REUSABLE_OPERATOR_EMAIL;
  const canProcess = isAssignedOperator && user?.role === "FIELD_OPERATOR";

  useEffect(() => {
    const sync = () => setRentals(readReusableContainerRentals());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(REUSABLE_CONTAINER_UPDATED_EVENT, sync);
    };
  }, []);

  const activeRentals = useMemo(
    () => rentals.filter((rental) => rental.status === "RENTED").sort((a, b) => b.rentedAt.localeCompare(a.rentedAt)),
    [rentals],
  );
  const returnedRentals = useMemo(() => rentals.filter((rental) => rental.status === "RETURNED"), [rentals]);
  const returnedToday = returnedRentals.filter((rental) => isToday(rental.returnedAt)).length;
  const returnRate = rentals.length ? Math.round((returnedRentals.length / rentals.length) * 100) : 0;
  const pointsIssued = reusableContainerPoints(rentals);
  const selectedRental = activeRentals.find((rental) => rental.id === returnRentalId);

  useEffect(() => {
    if (!activeRentals.some((rental) => rental.id === returnRentalId)) {
      setReturnRentalId(activeRentals[0]?.id ?? "");
    }
  }, [activeRentals, returnRentalId]);

  function save(next: ContainerRental[]) {
    window.localStorage.setItem(REUSABLE_CONTAINER_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(REUSABLE_CONTAINER_UPDATED_EVENT));
    setRentals(next);
  }

  function submitRental(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canProcess || !rentalForm.visitorCode.trim()) return;
    const rental = createContainerRental({ ...rentalForm, operatorEmail: REUSABLE_OPERATOR_EMAIL });
    save([rental, ...rentals]);
    setRentalForm(EMPTY_RENT_FORM);
    setReturnRentalId(rental.id);
    setMode("RETURN");
    setNotice(`${rental.rentalCode} 대여를 등록했어요. 반납 시 스탬프가 적립됩니다.`);
  }

  function submitReturn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canProcess || !returnRentalId) return;
    const next = completeContainerReturn(rentals, returnRentalId);
    if (!next) {
      setNotice("이미 반납 처리된 대여 건이에요.");
      return;
    }
    const returned = next.find((rental) => rental.id === returnRentalId);
    save(next);
    setNotice(`${returned?.rentalCode ?? "대여 건"} 반납 완료 · +${REUSABLE_STAMP_POINTS}P 스탬프 연계`);
  }

  function handleScan(value: string) {
    const code = value.trim();
    setScannerMode(null);
    if (!code) return;
    if (mode === "RENT") {
      setRentalForm((current) => ({ ...current, visitorCode: code }));
      setNotice("방문객 코드가 입력됐어요. 대여 정보를 확인하고 등록하세요.");
      return;
    }
    const rental = activeRentals.find((item) => item.rentalCode === code.toUpperCase() || item.visitorCode === code.toUpperCase());
    if (!rental) {
      setNotice("반납 대기 중인 대여 코드를 찾지 못했어요.");
      return;
    }
    setReturnRentalId(rental.id);
    setNotice(`${rental.rentalCode} 반납 건을 선택했어요.`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-primary/5 p-5 dark:border-emerald-900/70 dark:from-emerald-950/40 dark:to-primary/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300">
              <Recycle className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">재사용기 대여·반납 관리</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                반납 완료를 기록하면 방문객의 REUSABLE_CUP 스탬프와 ESG 포인트 적립 상태로 연계합니다.
              </p>
            </div>
          </div>
          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
            <UserRound className="size-3" /> 담당 현장관리자
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-emerald-200/70 pt-3 text-xs dark:border-emerald-900/70">
          <span className="font-semibold text-foreground">{REUSABLE_OPERATOR_EMAIL}</span>
          <span className="text-muted-foreground">FIELD_OPERATOR · 대여·반납 처리 담당</span>
          <span className="text-muted-foreground">반납 1건당 +{REUSABLE_STAMP_POINTS}P</span>
        </div>
      </div>

      {!canProcess && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          현재 계정은 조회 전용입니다. 대여·반납 처리는 {REUSABLE_OPERATOR_EMAIL} 계정으로 로그인해 주세요.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="대여 중" value={`${activeRentals.length}건`} helper="반납 대기 용기" icon={Clock3} tone="warning" />
        <StatCard label="오늘 반납" value={`${returnedToday}건`} helper="현장 회수 완료" icon={CheckCircle2} tone="success" />
        <StatCard label="반납률" value={`${returnRate}%`} helper={`${rentals.length}건 기준`} icon={Recycle} tone="primary" />
        <StatCard label="연계 ESG 포인트" value={`${pointsIssued.toLocaleString()}P`} helper="반납 완료 기준" icon={Coins} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">현장 처리</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">방문객 코드 또는 대여 QR을 확인해 대여·반납을 기록하세요.</p>
          </div>
          <Tabs value={mode} onValueChange={(value) => { setMode((value ?? "RENT") as FlowMode); setNotice(undefined); }}>
            <TabsList>
              <TabsTrigger value="RENT"><ArrowUpFromLine className="size-3.5" /> 대여</TabsTrigger>
              <TabsTrigger value="RETURN"><ArrowDownToLine className="size-3.5" /> 반납</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {mode === "RENT" ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submitRental}>
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="visitor-code">방문객 코드</Label>
              <div className="flex gap-2">
                <Input
                  id="visitor-code"
                  value={rentalForm.visitorCode}
                  onChange={(event) => setRentalForm((current) => ({ ...current, visitorCode: event.target.value }))}
                  placeholder="예: VIS-2048"
                  autoComplete="off"
                  disabled={!canProcess}
                  required
                />
                <Button type="button" size="icon" variant="outline" aria-label="방문객 QR 스캔" disabled={!canProcess} onClick={() => setScannerMode("RENT")}>
                  <ScanLine className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>용기 종류</Label>
              <Select value={rentalForm.containerType} onValueChange={(value) => setRentalForm((current) => ({ ...current, containerType: value as ContainerType }))}>
                <SelectTrigger className="w-full" disabled={!canProcess}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTAINER_TYPE_LABEL) as ContainerType[]).map((type) => <SelectItem key={type} value={type}>{CONTAINER_TYPE_LABEL[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="container-quantity">수량</Label>
              <Input id="container-quantity" type="number" min={1} max={20} value={rentalForm.quantity} onChange={(event) => setRentalForm((current) => ({ ...current, quantity: Number(event.target.value) }))} disabled={!canProcess} required />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Label>대여 지점</Label>
              <Select value={rentalForm.station} onValueChange={(value) => setRentalForm((current) => ({ ...current, station: String(value ?? STATIONS[0]) }))}>
                <SelectTrigger className="w-full" disabled={!canProcess}><SelectValue /></SelectTrigger>
                <SelectContent>{STATIONS.map((station) => <SelectItem key={station} value={station}>{station}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="w-full" disabled={!canProcess || !rentalForm.visitorCode.trim()}><ArrowUpFromLine className="size-4" /> 대여 등록</Button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submitReturn}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1">
                <Label>반납 대여 건</Label>
                <Select value={returnRentalId || "none"} onValueChange={(value) => setReturnRentalId(value === "none" ? "" : String(value ?? ""))}>
                  <SelectTrigger className="w-full" disabled={!canProcess}><SelectValue placeholder="반납 대여 건 선택" /></SelectTrigger>
                  <SelectContent>
                    {activeRentals.length === 0 && <SelectItem value="none">반납 대기 중인 대여 없음</SelectItem>}
                    {activeRentals.map((rental) => <SelectItem key={rental.id} value={rental.id}>{rental.rentalCode} · {rental.visitorCode} · {rental.quantity}개</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={!canProcess} onClick={() => setScannerMode("RETURN")}><QrCode className="size-3.5" /> 대여 QR 확인</Button>
                <Button type="submit" disabled={!canProcess || !returnRentalId}><CheckCircle2 className="size-3.5" /> 반납 완료</Button>
              </div>
            </div>
            {selectedRental && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <span className="font-semibold text-foreground">{CONTAINER_TYPE_LABEL[selectedRental.containerType]} {selectedRental.quantity}개</span>
                <span className="text-muted-foreground">{selectedRental.station}</span>
                <span className="text-muted-foreground">대여 {formatTime(selectedRental.rentedAt)}</span>
                <Badge variant="outline" className="text-[10px]">반납 시 +{REUSABLE_STAMP_POINTS}P</Badge>
              </div>
            )}
          </form>
        )}

        {scannerMode && (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
            <QrScanner label={mode === "RENT" ? "방문객 QR 스캔" : "대여 QR 스캔"} onScan={handleScan} />
            <p className="mt-2 text-[11px] text-muted-foreground">카메라를 사용할 수 없으면 위 입력·목록에서 직접 선택할 수 있어요.</p>
          </div>
        )}
        {notice && <p className="mt-3 text-xs font-medium text-primary" role="status">{notice}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">최근 대여·반납 활동</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">반납 완료 건은 방문객 스탬프 연계 대상으로 표시됩니다.</p>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]"><Coins className="size-3" /> REUSABLE_CUP</Badge>
        </div>
        {rentals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <Recycle className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">아직 처리한 대여 건이 없어요.</p>
            <p className="mt-1 text-xs text-muted-foreground">위에서 방문객 코드를 입력해 첫 대여를 등록하세요.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {rentals.slice(0, 8).map((rental) => (
              <div key={rental.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${rental.status === "RETURNED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {rental.status === "RETURNED" ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{rental.rentalCode} · {rental.visitorCode}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{CONTAINER_TYPE_LABEL[rental.containerType]} {rental.quantity}개 · {rental.station} · {formatTime(rental.returnedAt ?? rental.rentedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={rental.status === "RETURNED" ? "success" : "warning"}>{rental.status === "RETURNED" ? "반납 완료" : "대여 중"}</StatusPill>
                  {rental.stampStatus === "ISSUED" && <Badge variant="secondary" className="text-[10px]">+{rental.stampPoints}P 적립</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-foreground">프론트 연계 흐름</p>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="flex gap-2"><ArrowUpFromLine className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">1. 대여</b><br />방문객 코드와 용기 수량을 기록합니다.</span></div>
          <div className="flex gap-2"><ArrowDownToLine className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">2. 반납</b><br />대여 건을 선택해 회수를 완료합니다.</span></div>
          <div className="flex gap-2"><Coins className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="text-foreground">3. 스탬프</b><br />반납 완료 상태와 +{REUSABLE_STAMP_POINTS}P를 방문객 화면에 표시합니다.</span></div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">현재는 프론트엔드 전용 데모 저장소(localStorage)입니다. 실제 서버 저장·중복 방지는 백엔드 API 연결 시 교체할 수 있습니다.</p>
      </section>
    </div>
  );
}
