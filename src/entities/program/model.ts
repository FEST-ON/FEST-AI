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

export const PROGRAM_STATUSES = ["DRAFT", "PUBLISHED", "ENDED", "ARCHIVED"] as const;

export const PROGRAM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "준비중", PUBLISHED: "게시", ENDED: "종료", ARCHIVED: "보관",
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
  area_id: string;
  starts_at: string;
  ends_at: string;
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
