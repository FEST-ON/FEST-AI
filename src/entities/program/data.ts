import { adminApi, adminFestivalId } from "@/shared/lib/api";
import type { OperationResource } from "./model";

export async function fetchOperationResources() {
  const festivalId = await adminFestivalId();
  const programs = await adminApi<Array<{
    id: string; title: string; category: string; status: string; summary?: string;
  }>>(`/admin/festivals/${festivalId}/programs`);
  const statuses: Record<string, OperationResource["status"]> = {
    DRAFT: "준비중", PUBLISHED: "운영중", ENDED: "완료", ARCHIVED: "완료",
  };
  return programs.map<OperationResource>((program) => ({
    id: program.id,
    category: "프로그램",
    name: program.title,
    manager: "-",
    contact: "-",
    location: "일정에서 확인",
    time: "프로그램별 상이",
    status: statuses[program.status] ?? "준비중",
    note: program.summary ?? "",
  }));
}
