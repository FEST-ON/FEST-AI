import { FESTIVAL_CODE, festivalApi, json, publicApi } from "@/shared/lib/api";
import { fetchAdminBusinesses, PARTICIPATION_LABEL } from "@/features/business-admin";
import { fetchStaffAssignments } from "@/features/staff";
import { seoulShort, seoulTime } from "@/shared/lib/utils";

export type OperationCategory = "프로그램" | "참여업체" | "부스" | "인력" | "자원봉사자";

export type OperationStatus = "준비중" | "운영중" | "완료" | "이슈";

export interface OperationResource {
  id: string;
  category: OperationCategory;
  name: string;
  manager: string;
  contact: string;
  location: string;
  time: string;
  status: OperationStatus;
  note: string;
}

// 서버 스키마(ProgramStatus)와 DB CHECK 제약이 받는 값 그대로다. 예전에는 여기에만 있던
// "ENDED"를 고르면 400이 났고, 실제 값인 "UNPUBLISHED"는 화면에서 고를 수 없었다.
export const PROGRAM_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;

export const PROGRAM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "준비중", PUBLISHED: "게시", UNPUBLISHED: "게시 종료", ARCHIVED: "보관",
};

export interface Program {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  status: string;
  version: number;
}

export interface ProgramSession {
  id: string;
  areaId: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  status: string;
  version: number;
}

export interface NewProgram {
  slug: string;
  title: string;
  summary?: string;
  category: string;
  status: string;
}

export interface NewProgramSession {
  areaId: string;
  startsAt: string;
  endsAt: string;
  capacity?: number | null;
  status: string;
}

const PROGRAM_STATUS: Record<string, OperationResource["status"]> = {
  DRAFT: "준비중", PUBLISHED: "운영중", UNPUBLISHED: "완료", ARCHIVED: "완료",
};

export async function fetchPrograms() {
  return festivalApi<Program[]>(`/programs`);
}

export async function fetchProgramSessions(programId: string) {
  return festivalApi<ProgramSession[]>(`/programs/${programId}/sessions`);
}

interface ContentItemRow {
  id: string;
  resourceType: string | null;
  resourceId: string | null;
}

/**
 * 프로그램을 방문객 채널에 올리기 위한 콘텐츠 초안을 만들고 검수를 요청한다.
 *
 * 공개 프로그램 목록은 게시된 콘텐츠 항목(content_items)을 조인해서 만든다. 그런데 콘텐츠
 * 항목을 만드는 화면이 공지뿐이라, 관리자가 등록한 프로그램은 상태를 PUBLISHED로 바꿔도
 * 방문객 앱·일정·예약 어디에도 나타나지 않았다(시드로 넣은 프로그램 하나만 보였다).
 *
 * 승인과 게시는 여기서 하지 않는다 — 작성자와 최종 승인자가 달라야 한다는 규칙이 있어서,
 * 검수·게시 관리 화면에서 검수자가 이어받는다.
 */
export async function submitProgramContent(program: Program) {
  const items = await festivalApi<ContentItemRow[]>(`/content-items`);
  const existing = items.find((item) => item.resourceType === "PROGRAM" && item.resourceId === program.id);
  const item = existing ?? (await festivalApi<ContentItemRow>(`/content-items`, json("POST", {
    contentType: "PROGRAM",
    resourceType: "PROGRAM",
    resourceId: program.id,
    slug: program.slug,
  })));
  const version = await festivalApi<{ id: string }>(`/content-items/${item.id}/versions`, json("POST", {
    language: "ko",
    body: { title: program.title, summary: program.summary ?? "" },
    changeNote: "운영관리 화면에서 검수 요청",
  }));
  await festivalApi(`/content-versions/${version.id}/submit`, { method: "POST" });
  return version;
}

export async function createProgram(input: NewProgram) {
  const program = await festivalApi<Program>(`/programs`, json("POST", input));
  // 등록과 동시에 콘텐츠 초안을 올려 둔다. 이 단계를 빼면 검수·게시 화면에 아무것도
  // 나타나지 않아 프로그램을 공개할 방법 자체가 없다.
  await submitProgramContent(program);
  return program;
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
      manager: business.registrationNo,
      contact: "-",
      location: business.boothNo ? `부스 ${business.boothNo}` : "부스 미지정",
      time: "-",
      status: business.participationStatus === "APPROVED" ? "운영중" : business.participationStatus === "REJECTED" ? "이슈" : "준비중",
      note: business.reviewComment ?? PARTICIPATION_LABEL[business.participationStatus] ?? "",
    };
    if (!business.boothNo) return [row];
    return [row, {
      ...row,
      id: `${business.id}-booth`,
      category: "부스" as const,
      name: `${business.boothNo} (${business.name})`,
      note: business.category,
    }];
  });

  const staffRows = staff.map<OperationResource>((assignment) => ({
    id: assignment.id,
    category: assignment.role === "FIELD_OPERATOR" ? "인력" : "자원봉사자",
    name: assignment.staffName,
    manager: assignment.dutyRole,
    contact: "-",
    location: "배치 구역",
    time: timeRange(assignment.startsAt, assignment.endsAt),
    status: assignment.acknowledgedAt ? "운영중" : "이슈",
    note: assignment.acknowledgedAt ? (assignment.task ?? "") : "배정 확인 대기 중입니다.",
  }));

  return [...programRows, ...businessRows, ...staffRows];
}
