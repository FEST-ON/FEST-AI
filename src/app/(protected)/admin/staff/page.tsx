"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, UserCog } from "lucide-react";
import {
  acknowledgeAssignment,
  createStaffAssignment,
  fetchMemberships,
  fetchStaffAssignments,
  type NewStaffAssignment,
} from "@/features/staff/api/staff";
import { fetchAreas } from "@/features/map/api/map-locations";
import { ADMIN_ROLE_LABEL } from "@/shared/lib/permissions";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal, seoulTime } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { seoulDateTime } from "@/shared/lib/utils";

function defaultForm(): NewStaffAssignment {
  const start = new Date();
  return {
    membershipId: "", areaId: "", dutyRole: "", task: "",
    startsAt: datetimeLocal(start), endsAt: datetimeLocal(new Date(start.getTime() + 4 * 60 * 60_000)),
  };
}

const ALL_AREAS = "__ALL__";

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { form, set, field, reset } = useForm<NewStaffAssignment>(defaultForm);
  const [areaFilter, setAreaFilter] = useState(ALL_AREAS);

  const assignments = useQuery({ queryKey: ["staff-assignments"], queryFn: fetchStaffAssignments });
  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });
  // 최고 관리자만 멤버십을 조회할 수 있다 — 권한이 없으면 배치 폼 없이 목록만 본다.
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: fetchMemberships, retry: false });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["festival-ai-brief"] });
  };
  const assign = useMutation({
    mutationFn: createStaffAssignment,
    meta: { success: "인력을 배치했어요." },
    onSuccess: () => { invalidate(); reset(); },
  });
  const acknowledge = useMutation({ mutationFn: acknowledgeAssignment, meta: { success: "배정을 확인 처리했어요." }, onSuccess: invalidate });

  const visible = (assignments.data ?? []).filter((row) => areaFilter === ALL_AREAS || row.area_id === areaFilter);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        구역별 현장 인력을 배치해요. 같은 인력의 근무 시간이 겹치면 서버가 배치를 거절하고, 배치되지 않은 구역은 운영 위험 브리핑에 인력 공백으로 잡힙니다.
      </p>

      {memberships.isError ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          인력 목록을 조회할 권한이 없어 배치 등록은 최고 관리자만 사용할 수 있어요.
        </p>
      ) : (
        <form
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            assign.mutate({
              ...form,
              task: form.task || undefined,
              startsAt: new Date(form.startsAt).toISOString(),
              endsAt: new Date(form.endsAt).toISOString(),
            });
          }}
        >
          <div className="space-y-1">
            <Label>인력</Label>
            <Select value={form.membershipId} onValueChange={(value) => set("membershipId")(String(value ?? ""))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="인력 선택" /></SelectTrigger>
              <SelectContent>
                {(memberships.data ?? []).filter((member) => member.status === "ACTIVE").map((member) => (
                  <SelectItem key={member.id} value={member.id}>{member.name} · {ADMIN_ROLE_LABEL[member.role] ?? member.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>구역</Label>
            <Select value={form.areaId} onValueChange={(value) => set("areaId")(String(value ?? ""))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="구역 선택" /></SelectTrigger>
              <SelectContent>
                {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="duty">담당 업무</Label>
            <Input id="duty" {...field("dutyRole")} required placeholder="예: 안전 관리" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="starts">시작</Label>
            <Input id="starts" type="datetime-local" {...field("startsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ends">종료</Label>
            <Input id="ends" type="datetime-local" {...field("endsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task">세부 지시(선택)</Label>
            <Input id="task" {...field("task")} />
          </div>
          <div className="sm:col-span-3 flex items-center justify-end gap-3">
            {assign.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(assign.error)}</p>}
            <Button type="submit" size="sm" disabled={!form.membershipId || !form.areaId || assign.isPending}>
              {assign.isPending ? "배치 중..." : "인력 배치"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="assignment-filter" className="text-xs text-muted-foreground">구역</Label>
        <Select value={areaFilter} onValueChange={(value) => setAreaFilter(String(value))}>
          <SelectTrigger id="assignment-filter" size="sm" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AREAS}>전체 구역</SelectItem>
            {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{visible.length}건</span>
      </div>

      <QueryState
        query={assignments}
        empty="표시할 배치가 없어요."
        emptyWhen={visible.length === 0}
        skeleton={<Skeleton className="h-32 w-full rounded-2xl" />}
      >
        {() => (
          <div className="space-y-2">
            {visible.map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <UserCog className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">{assignment.staff_name}</p>
                    <Badge variant="outline" className="text-[10px]">{ADMIN_ROLE_LABEL[assignment.role] ?? assignment.role}</Badge>
                    <span className="text-xs text-muted-foreground">{assignment.duty_role}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    {seoulDateTime(assignment.starts_at)} ~ {seoulTime(assignment.ends_at)}
                    {assignment.task && ` · ${assignment.task}`}
                  </p>
                </div>
                {assignment.acknowledged_at ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" /> 확인 완료
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" disabled={acknowledge.isPending && acknowledge.variables === assignment.id} onClick={() => acknowledge.mutate(assignment.id)}>
                    배정 확인
                  </Button>
                )}
              </div>
            ))}
            {acknowledge.error && <p className="text-sm text-destructive">{queryErrorMessage(acknowledge.error)}</p>}
          </div>
        )}
      </QueryState>
    </div>
  );
}
