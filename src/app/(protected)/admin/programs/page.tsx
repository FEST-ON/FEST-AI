"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import {
  createProgram,
  createProgramSession,
  deleteProgram,
  deleteProgramSession,
  fetchOperationResources,
  fetchProgramSessions,
  fetchPrograms,
  updateProgram,
  PROGRAM_STATUSES,
  PROGRAM_STATUS_LABEL,
} from "@/entities/program";
import type { NewProgram, NewProgramSession, OperationCategory, Program } from "@/entities/program";
import { fetchAreas } from "@/features/map/api/map-locations";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmButton } from "@/shared/ui/confirm-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { EmptyState, ErrorState, QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { StatusPill } from "@/shared/ui/status-pill";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal, seoulShort } from "@/shared/lib/utils";

const CATEGORIES: (OperationCategory | "전체")[] = ["전체", "프로그램", "참여업체", "부스", "인력", "자원봉사자"];

// 방문객 fetchSchedule()이 이 코드로 한글 카테고리를 찾는다 — 값이 어긋나면 "기타"로 떨어진다.
const PROGRAM_CATEGORIES = [
  { value: "performance", label: "공연" },
  { value: "experience", label: "체험" },
  { value: "exhibition", label: "전시" },
  { value: "food", label: "푸드" },
  { value: "event", label: "행사" },
];

const STATUS_TONE = { 준비중: "neutral", 운영중: "success", 완료: "accent", 이슈: "danger" } as const;

const EMPTY_PROGRAM: NewProgram = { slug: "", title: "", summary: "", category: "performance", status: "DRAFT" };

function SessionPanel({ program }: { program: Program }) {
  const queryClient = useQueryClient();
  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });
  const sessions = useQuery({ queryKey: ["program-sessions", program.id], queryFn: () => fetchProgramSessions(program.id) });
  const { form, set, field } = useForm<NewProgramSession>(() => {
    const start = new Date();
    return { areaId: "", startsAt: datetimeLocal(start), endsAt: datetimeLocal(new Date(start.getTime() + 60 * 60_000)), capacity: 30, status: "OPEN" };
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["program-sessions", program.id] });
    queryClient.invalidateQueries({ queryKey: ["operation-resources"] });
  };
  const create = useMutation({ mutationFn: createProgramSession, meta: { success: "회차를 추가했어요." }, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteProgramSession, meta: { success: "회차를 삭제했어요." }, onSuccess: invalidate });
  const areaName = (id: string) => areas.data?.find((area) => area.id === id)?.name ?? "구역";

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground"><CalendarPlus className="size-3.5" /> 회차 관리</p>
      {sessions.isLoading ? (
        <Skeleton className="mt-2 h-10 w-full rounded-lg" />
      ) : sessions.data?.length ? (
        <ul className="mt-2 space-y-1">
          {sessions.data.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-foreground">
                {seoulShort(session.starts_at)}
                {" · "}{areaName(session.area_id)}{session.capacity !== null && ` · 정원 ${session.capacity}명`}
              </span>
              <ConfirmButton
                variant="ghost"
                size="icon-xs"
                aria-label="회차 삭제"
                className="text-muted-foreground hover:text-destructive"
                disabled={remove.isPending && remove.variables === session.id}
                title="회차를 삭제할까요?"
                description={`${seoulShort(session.starts_at)} · ${areaName(session.area_id)} 회차가 삭제됩니다. 이미 잡힌 예약이 있으면 함께 사라져요.`}
                confirmLabel="삭제"
                onConfirm={() => remove.mutate(session.id)}
              >
                <Trash2 className="size-3.5" />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">등록된 회차가 없습니다.</p>
      )}

      <form
        className="mt-3 grid gap-2 sm:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({
            ...form,
            programId: program.id,
            startsAt: new Date(form.startsAt).toISOString(),
            endsAt: new Date(form.endsAt).toISOString(),
          });
        }}
      >
        <Select value={form.areaId} onValueChange={(value) => set("areaId")(String(value ?? ""))}>
          <SelectTrigger className="w-full"><SelectValue placeholder="구역" /></SelectTrigger>
          <SelectContent>
            {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="datetime-local" {...field("startsAt")} required />
        <Input type="datetime-local" {...field("endsAt")} required />
        <Input type="number" min={0} placeholder="정원" value={form.capacity ?? ""} onChange={(event) => set("capacity")(event.target.value === "" ? null : Number(event.target.value))} />
        <Button type="submit" size="sm" disabled={!form.areaId || create.isPending}>회차 추가</Button>
      </form>
      {(create.error || remove.error) && <p className="mt-2 text-[11px] text-destructive">{queryErrorMessage(create.error ?? remove.error)}</p>}
    </div>
  );
}

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  const resources = useQuery({ queryKey: ["operation-resources"], queryFn: fetchOperationResources });
  const programs = useQuery({ queryKey: ["admin-programs"], queryFn: fetchPrograms });
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const [creating, setCreating] = useState(false);
  const { form, set, field, reset } = useForm<NewProgram>(EMPTY_PROGRAM);
  const [openSessions, setOpenSessions] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    queryClient.invalidateQueries({ queryKey: ["operation-resources"] });
  };
  const create = useMutation({ mutationFn: createProgram, meta: { success: "프로그램을 등록했어요." }, onSuccess: () => { invalidate(); reset(); setCreating(false); } });
  const update = useMutation({ mutationFn: updateProgram, meta: { success: "프로그램을 수정했어요." }, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteProgram, meta: { success: "프로그램을 보관했어요." }, onSuccess: invalidate });

  const filtered = useMemo(() => {
    if (!resources.data) return [];
    return category === "전체" ? resources.data : resources.data.filter((row) => row.category === category);
  }, [resources.data, category]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (resources.data ?? []).forEach((row) => map.set(row.category, (map.get(row.category) ?? 0) + 1));
    return map;
  }, [resources.data]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        프로그램, 참여업체, 부스, 인력을 하나의 화면에서 통합 관리해요. 프로그램은 여기서 바로 등록·수정하고 회차를 추가할 수 있어요.
      </p>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-foreground">프로그램 관리</p>
          <Button size="sm" onClick={() => setCreating((value) => !value)}><Plus className="size-3.5" /> 프로그램 등록</Button>
        </div>

        {creating && (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => { event.preventDefault(); create.mutate({ ...form, summary: form.summary || undefined }); }}
          >
            <div className="space-y-1">
              <Label htmlFor="program-title">제목</Label>
              <Input id="program-title" {...field("title")} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="program-slug">슬러그</Label>
              <Input id="program-slug" {...field("slug")} required pattern="[a-z0-9-]+" placeholder="green-market" />
            </div>
            <div className="space-y-1">
              <Label>분류</Label>
              {/* 방문객 일정 화면이 이 값으로 한글 카테고리를 매핑한다 — 원시값을 직접 타이핑하지 않게 고정한다. */}
              <Select value={form.category} onValueChange={(value) => set("category")(String(value))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_CATEGORIES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>상태</Label>
              <Select value={form.status} onValueChange={(value) => set("status")(String(value))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_STATUSES.map((status) => <SelectItem key={status} value={status}>{PROGRAM_STATUS_LABEL[status]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor="program-summary">소개</Label>
              <Textarea id="program-summary" rows={2} {...field("summary")} />
            </div>
            <div className="sm:col-span-4 flex items-center justify-end gap-3">
              {create.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(create.error)}</p>}
              <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>취소</Button>
              <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? "등록 중..." : "등록"}</Button>
            </div>
          </form>
        )}

        <div className="mt-3 space-y-2">
          <QueryState query={programs} skeleton={<Skeleton className="h-20 w-full rounded-xl" />}>
            {(rows) => (
              rows.map((program) => (
                <div key={program.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{program.title}</p>
                      <p className="text-[11px] text-muted-foreground">{program.slug} · {program.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={program.status} onValueChange={(value) => update.mutate({ id: program.id, version: program.version, status: String(value) })}>
                        <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROGRAM_STATUSES.map((status) => <SelectItem key={status} value={status}>{PROGRAM_STATUS_LABEL[status]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setOpenSessions(openSessions === program.id ? null : program.id)}>회차</Button>
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        aria-label="프로그램 보관"
                        disabled={remove.isPending && remove.variables === program.id}
                        title="프로그램을 보관할까요?"
                        description={`"${program.title}"이(가) 방문객 화면에서 내려갑니다. 회차와 예약 기록은 남아요.`}
                        confirmLabel="보관"
                        onConfirm={() => remove.mutate(program.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmButton>
                    </div>
                  </div>
                  {openSessions === program.id && <SessionPanel program={program} />}
                </div>
              ))
            )}
          </QueryState>
        </div>
      </section>

      <Tabs value={category} onValueChange={(value) => setCategory(value as typeof category)}>
        <TabsList className="flex-wrap">
          {CATEGORIES.map((value) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {value}
              {value !== "전체" && <span className="text-[10px] text-muted-foreground">{counts.get(value) ?? 0}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {resources.isLoading ? (
          <SkeletonList count={5} className="h-10 w-full" wrapperClassName="p-4" />
        ) : resources.isError || !resources.data ? (
          <ErrorState className="m-4" message={queryErrorMessage(resources.error)} onRetry={() => resources.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState className="m-4" message="표시할 운영 자원이 없어요." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>위치</TableHead>
                  <TableHead>시간</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{row.category}</Badge></TableCell>
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.manager}</TableCell>
                    <TableCell className="text-muted-foreground">{row.location}</TableCell>
                    <TableCell className="text-muted-foreground">{row.time}</TableCell>
                    <TableCell>
                      <StatusPill tone={STATUS_TONE[row.status]} className="text-[11px]">{row.status}</StatusPill>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{row.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
