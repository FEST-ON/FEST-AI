import { visitorApi } from "@/shared/lib/api";

export interface CoursePlanItem {
  id: string;
  sequence_no: number;
  recommendation_reason: string;
  // 서버는 선택된 program_sessions 행을 그대로 실어 보낸다(회차 id + 프로그램 제목).
  program: {
    id: string;
    program_id: string;
    title: string;
    category: string;
    starts_at: string;
    ends_at: string;
    area_name: string;
  };
}

export interface CoursePlan {
  id: string;
  expected_duration_min: number;
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
