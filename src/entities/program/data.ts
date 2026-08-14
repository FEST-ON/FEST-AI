import { FESTIVAL_CODE, festivalApi, json, publicApi } from "@/shared/lib/api";
import { fetchAdminBusinesses, PARTICIPATION_LABEL } from "@/features/business-admin/api/businesses";
import { fetchStaffAssignments } from "@/features/staff/api/staff";
import type { NewProgram, NewProgramSession, OperationResource, Program, ProgramSession } from "./model";
import { seoulShort, seoulTime } from "@/shared/lib/utils";

const PROGRAM_STATUS: Record<string, OperationResource["status"]> = {
  DRAFT: "준비중", PUBLISHED: "운영중", ENDED: "완료", ARCHIVED: "완료",
};

export async function fetchPrograms() {
  return festivalApi<Program[]>(`/programs`);
}

export async function fetchProgramSessions(programId: string) {
  return festivalApi<ProgramSession[]>(`/programs/${programId}/sessions`);
}

export async function createProgram(input: NewProgram) {
  return festivalApi(`/programs`, json("POST", input));
}

export async function updateProgram({ id, version, ...input }: Partial<NewProgram> & { id: string; version: number }) {
  return festivalApi(`/programs/${id}`, json("PATCH", { ...input, version }));
}

export async function deleteProgram(id: string) {
  return festivalApi<void>(`/programs/${id}`, { method: "DELETE" });
}

export async function createProgramSession({ programId, ...input }: NewProgramSession & { programId: string }) {
  return festivalApi(`/programs/${programId}/sessions`, json("POST", input));
}

export async function deleteProgramSession(sessionId: string) {
  return festivalApi<void>(`/program-sessions/${sessionId}`, { method: "DELETE" });
}

const timeRange = (from: string, to: string) =>
  `${seoulShort(from)} ~ ${seoulTime(to)}`;

/**
 * 통합 운영관리 표: 프로그램·참여업체·부스·인력을 한 목록으로 합친다.
 * 한 종류라도 권한이 없어 실패하면 그 줄만 비우고 나머지는 보여준다.
 */
export async function fetchOperationResources(): Promise<OperationResource[]> {
  const [programs, businesses, staff, published] = await Promise.all([
    fetchPrograms(),
    fetchAdminBusinesses().catch(() => []),
    fetchStaffAssignments().catch(() => []),
    // 회차 수는 관리자 목록에 없다. 게시된 프로그램은 공개 API가 회차까지 함께 내려준다.
    publicApi<Array<{ id: string; sessions: unknown[] }>>(`/public/festivals/${FESTIVAL_CODE}/programs`).catch(() => []),
  ]);
  const sessionCount = new Map(published.map((program) => [program.id, program.sessions.length]));

  const programRows = programs.map<OperationResource>((program) => ({
    id: program.id,
    category: "프로그램",
    name: program.title,
    manager: "-",
    contact: "-",
    location: "일정에서 확인",
    time: "회차별 상이",
    // 게시됐는데 회차가 하나도 없으면 방문객에게 빈 화면이 나간다 — 이슈로 잡는다.
    status: program.status === "PUBLISHED" && sessionCount.get(program.id) === 0 ? "이슈" : PROGRAM_STATUS[program.status] ?? "준비중",
    note: program.status === "PUBLISHED" && sessionCount.get(program.id) === 0 ? "게시됐지만 등록된 회차가 없습니다." : program.summary ?? "",
  }));

  const businessRows = businesses.flatMap<OperationResource>((business) => {
    const row: OperationResource = {
      id: business.id,
      category: "참여업체",
      name: business.name,
      manager: business.registration_no,
      contact: "-",
      location: business.booth_no ? `부스 ${business.booth_no}` : "부스 미지정",
      time: "-",
      status: business.participation_status === "APPROVED" ? "운영중" : business.participation_status === "REJECTED" ? "이슈" : "준비중",
      note: business.review_comment ?? PARTICIPATION_LABEL[business.participation_status] ?? "",
    };
    if (!business.booth_no) return [row];
    return [row, {
      ...row,
      id: `${business.id}-booth`,
      category: "부스" as const,
      name: `${business.booth_no} (${business.name})`,
      note: business.category,
    }];
  });

  const staffRows = staff.map<OperationResource>((assignment) => ({
    id: assignment.id,
    category: assignment.role === "FIELD_OPERATOR" ? "인력" : "자원봉사자",
    name: assignment.staff_name,
    manager: assignment.duty_role,
    contact: "-",
    location: "배치 구역",
    time: timeRange(assignment.starts_at, assignment.ends_at),
    status: assignment.acknowledged_at ? "운영중" : "이슈",
    note: assignment.acknowledged_at ? (assignment.task ?? "") : "배정 확인 대기 중입니다.",
  }));

  return [...programRows, ...businessRows, ...staffRows];
}
