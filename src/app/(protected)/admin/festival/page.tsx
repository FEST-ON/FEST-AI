"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Copy, SmartphoneNfc, Trash2 } from "lucide-react";
import {
  cloneFestival,
  createFacility,
  deleteFacility,
  fetchCurrentFestival,
  fetchFacilities,
  FESTIVAL_STATUSES,
  updateFacility,
  updateFestival,
  type AdminFestival,
  type CloneFestivalInput,
  type NewFacility,
} from "@/features/festival-admin/api/festival-admin";
import { fetchAreas } from "@/features/map/api/map-locations";
import { useForm } from "@/shared/lib/use-form";
import { datetimeLocal } from "@/shared/lib/utils";
import { ALL_MENUS_ON, VISITOR_MENU_ITEMS } from "@/features/visitor-menu-settings/model/store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmButton } from "@/shared/ui/confirm-button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { ErrorState, queryErrorMessage } from "@/shared/ui/query-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";

const FACILITY_TYPES = ["RESTROOM", "PARKING", "FIRST_AID", "INFO", "NURSING_ROOM", "STORAGE"];

const FACILITY_LABEL: Record<string, string> = {
  RESTROOM: "화장실", PARKING: "주차장", FIRST_AID: "구급실", INFO: "안내소", NURSING_ROOM: "수유실", STORAGE: "물품보관소",
};

export default function FestivalSettingsPage() {
  const festival = useQuery({ queryKey: ["current-festival"], queryFn: fetchCurrentFestival });

  if (festival.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (festival.isError || !festival.data) {
    return <ErrorState message={queryErrorMessage(festival.error)} onRetry={() => festival.refetch()} />;
  }
  // 서버 값이 도착한 뒤에만 폼을 만든다 — 편집 중에 배경 갱신이 입력을 덮어쓰지 않도록.
  return <FestivalSettings festival={festival.data} />;
}

function FestivalSettings({ festival: data }: { festival: AdminFestival }) {
  const queryClient = useQueryClient();
  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: fetchAreas });
  const facilities = useQuery({ queryKey: ["admin-facilities"], queryFn: fetchFacilities });

  const { form, set: formSet, field: formField } = useForm({
    name: data.name,
    description: data.description ?? "",
    status: data.status,
    startsAt: datetimeLocal(data.starts_at),
    endsAt: datetimeLocal(data.ends_at),
  });
  const { form: clone, field: cloneField } = useForm<CloneFestivalInput>({ code: "", name: "", startsAt: "", endsAt: "" });
  const { form: facility, set: facilitySet, field: facilityField, reset: resetFacility } = useForm<NewFacility>({ areaId: "", name: "", facilityType: "RESTROOM", status: "ACTIVE" });

  const save = useMutation({
    mutationFn: updateFestival,
    meta: { success: "축제 정보를 저장했어요." },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-festival"] }),
  });
  const duplicate = useMutation({
    mutationFn: cloneFestival,
    meta: { success: "복제했어요. 새 축제는 축제 코드를 바꿔 접속하세요." },
  });

  const invalidateFacilities = () => queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
  const addFacility = useMutation({
    mutationFn: createFacility,
    meta: { success: "편의시설을 추가했어요." },
    onSuccess: () => { invalidateFacilities(); resetFacility(); },
  });
  const toggleFacility = useMutation({ mutationFn: updateFacility, meta: { success: "시설 운영 상태를 바꿨어요." }, onSuccess: invalidateFacilities });

  const menus = { ...ALL_MENUS_ON, ...(data.visitor_menus ?? {}) };
  const saveMenus = useMutation({
    mutationFn: updateFestival,
    meta: { success: "방문객 메뉴 노출을 저장했어요." },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-festival"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-menus"] });
    },
  });
  const removeFacility = useMutation({ mutationFn: deleteFacility, meta: { success: "편의시설을 삭제했어요." }, onSuccess: invalidateFacilities });

  const areaName = (id: string) => areas.data?.find((area) => area.id === id)?.name ?? "구역";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        축제 기본 정보와 공개 상태, 편의시설을 관리해요. 다음 회차 축제는 현재 기준정보를 복제해 시작할 수 있어요.
      </p>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <SmartphoneNfc className="size-4 text-primary" /> 방문객 메뉴 노출
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          끄면 모든 방문객의 홈 화면·하단 메뉴에서 숨겨져요. 페이지 주소로는 계속 접근할 수 있어요.
        </p>
        <div className="mt-3 divide-y divide-border">
          {VISITOR_MENU_ITEMS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={menus[key]}
                disabled={saveMenus.isPending}
                onCheckedChange={(checked) =>
                  saveMenus.mutate({ version: data.version, visitorMenus: { ...menus, [key]: checked } })
                }
              />
            </div>
          ))}
        </div>
        {saveMenus.error && <p className="mt-2 text-xs text-destructive">{queryErrorMessage(saveMenus.error)}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Building2 className="size-4 text-primary" /> 축제 정보
          <Badge variant="outline" className="ml-1 text-[10px]">{data.code}</Badge>
        </h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({
              name: form.name,
              description: form.description || null,
              status: form.status,
              startsAt: new Date(form.startsAt).toISOString(),
              endsAt: new Date(form.endsAt).toISOString(),
              version: data.version,
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="festival-name">축제명</Label>
            <Input id="festival-name" {...formField("name")} required />
          </div>
          <div className="space-y-1">
            <Label>공개 상태</Label>
            <Select value={form.status} onValueChange={(value) => formSet("status")(String(value))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FESTIVAL_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>지원 언어</Label>
            <p className="flex flex-wrap gap-1 pt-1.5">
              {data.supported_languages.map((language) => <Badge key={language} variant="outline" className="text-[10px]">{language}</Badge>)}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="festival-starts">시작</Label>
            <Input id="festival-starts" type="datetime-local" {...formField("startsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="festival-ends">종료</Label>
            <Input id="festival-ends" type="datetime-local" {...formField("endsAt")} required />
          </div>
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="festival-description">소개</Label>
            <Textarea id="festival-description" rows={2} {...formField("description")} />
          </div>
          <div className="sm:col-span-4 flex items-center justify-end gap-3">
            <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? "저장 중..." : "저장"}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Copy className="size-4 text-primary" /> 다음 회차로 복제</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">구역·시설·프로그램 기준정보를 그대로 복제한 새 축제를 만듭니다.</p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            duplicate.mutate({ ...clone, startsAt: new Date(clone.startsAt).toISOString(), endsAt: new Date(clone.endsAt).toISOString() });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="clone-code">새 축제 코드</Label>
            <Input id="clone-code" {...cloneField("code")} required placeholder="EST35-2027" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="clone-name">새 축제명</Label>
            <Input id="clone-name" {...cloneField("name")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="clone-starts">시작</Label>
            <Input id="clone-starts" type="datetime-local" {...cloneField("startsAt")} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="clone-ends">종료</Label>
            <Input id="clone-ends" type="datetime-local" {...cloneField("endsAt")} required />
          </div>
          <div className="sm:col-span-4 flex items-center justify-end gap-3">
            <Button type="submit" size="sm" disabled={duplicate.isPending}>{duplicate.isPending ? "복제 중..." : "복제"}</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">편의시설</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => { event.preventDefault(); addFacility.mutate(facility); }}
        >
          <Select value={facility.areaId} onValueChange={(value) => facilitySet("areaId")(String(value ?? ""))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="구역" /></SelectTrigger>
            <SelectContent>
              {(areas.data ?? []).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="시설명" {...facilityField("name")} required />
          <Select value={facility.facilityType} onValueChange={(value) => facilitySet("facilityType")(String(value))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FACILITY_TYPES.map((type) => <SelectItem key={type} value={type}>{FACILITY_LABEL[type]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={!facility.areaId || addFacility.isPending}>시설 추가</Button>
        </form>

        <div className="mt-3 space-y-2">
          {facilities.isLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : facilities.data?.length === 0 ? (
            <p className="text-xs text-muted-foreground">등록된 편의시설이 없습니다.</p>
          ) : (
            facilities.data?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{FACILITY_LABEL[item.facility_type] ?? item.facility_type} · {areaName(item.area_id)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={toggleFacility.isPending && toggleFacility.variables?.id === item.id}
                    onClick={() => toggleFacility.mutate({ id: item.id, version: item.version, status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                  >
                    {item.status === "ACTIVE" ? "운영 종료" : "운영 시작"}
                  </Button>
                  <ConfirmButton
                    size="sm"
                    variant="outline"
                    aria-label="시설 삭제"
                    disabled={removeFacility.isPending && removeFacility.variables === item.id}
                    title="편의시설을 삭제할까요?"
                    description={`"${item.name}"이(가) 방문객 지도와 안내에서 사라집니다.`}
                    confirmLabel="삭제"
                    onConfirm={() => removeFacility.mutate(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmButton>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
