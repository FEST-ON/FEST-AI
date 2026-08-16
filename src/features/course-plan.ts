import { visitorApi } from "@/shared/lib/api";

export interface CoursePlanItem {
  id: string;
  sequenceNo: number;
  recommendationReason: string;
  // 서버는 선택된 program_sessions 행을 그대로 실어 보낸다(회차 id + 프로그램 제목).
  program: {
    id: string;
    programId: string;
    title: string;
    category: string;
    startsAt: string;
    endsAt: string;
    areaName: string;
  };
}

export interface CoursePlan {
  id: string;
  expectedDurationMin: number;
  items: CoursePlanItem[];
}

export interface CoursePlanRequest {
  interests: string[];
  durationMin: number;
  companionType?: string;
  areaId?: string;
}

export function createCoursePlan(input: CoursePlanRequest) {
  return visitorApi<CoursePlan>("/visitor/course-plans", {
    method: "POST",
    // startsAt을 지금으로 고정해야 서버가 이미 지난 회차를 코스에 넣지 않는다.
    body: JSON.stringify({ ...input, startsAt: new Date().toISOString(), accessibility: {}, excludedProgramIds: [] }),
  });
}
