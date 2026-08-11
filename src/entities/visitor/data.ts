import { delay } from "@/shared/lib/async";
import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";
import { surveyQuestionType } from "./model";
import type { RecommendedCourse, SurveyAnswer, SurveyQuestion, WaitTicket } from "./model";

export const sampleCourse: RecommendedCourse = {
  id: "course-family-3h",
  title: "가족과 함께, 여유롭게 3시간 코스",
  matchReason: "동행: 가족 · 관심사: 체험, 푸드 · 체류시간: 3시간 기준 추천",
  totalMinutes: 180,
  stops: [
    { order: 1, time: "14:00", title: "통합 안내소에서 스탬프 투어 시작", location: "정문 입구", note: "유아 동반 시 대여용 웨건 수령 가능" },
    { order: 2, time: "14:20", title: "업사이클링 공방 체험", location: "체험존 A-2", note: "혼잡도 여유 · 대기 2분" },
    { order: 3, time: "15:10", title: "그린마켓 · 로컬푸드 간식", location: "푸드존 F-3", note: "다회용기 이용 시 스탬프 적립" },
    { order: 4, time: "16:00", title: "지속가능 사진전 관람", location: "전시홀", note: "실내 휴게공간, 수유실 인접" },
    { order: 5, time: "16:50", title: "물빛광장 산책 및 마무리", location: "물빛광장", note: "다음 코스: 야간 공연 대기 없이 관람 가능" },
  ],
};

export const waitTickets: WaitTicket[] = [
  { id: "w1", program: "업사이클링 공방 체험", number: 128, peopleAhead: 4, estimatedWaitMinutes: 12, status: "대기중" },
  { id: "w2", program: "드론라이트쇼 명당석", number: 45, peopleAhead: 0, estimatedWaitMinutes: 0, status: "호출됨" },
];

export const surveyQuestions: SurveyQuestion[] = [
  { id: "q1", surveyId: "demo", question: "오늘 축제는 전반적으로 만족스러우셨나요?", type: "rating", required: true },
  { id: "q2", surveyId: "demo", question: "가장 만족한 프로그램은 무엇인가요?", type: "single_choice", options: ["공연", "체험", "푸드", "전시"], required: true },
  { id: "q3", surveyId: "demo", question: "친환경(다회용기·분리배출) 캠페인에 참여하셨나요?", type: "single_choice", options: ["참여함", "참여 안 함", "다음엔 참여할게요"], required: true },
];

export async function fetchRecommendedCourse() {
  return delay(sampleCourse, 700);
}
export async function fetchWaitTickets() {
  return delay(waitTickets, 400);
}
export async function fetchSurveyQuestions() {
  const surveys = await publicApi<Array<{
    id: string;
    questions: Array<{ id: string; prompt: string; type: string; options?: string[]; required: boolean }>;
  }>>(`/public/festivals/${FESTIVAL_CODE}/surveys`);
  const survey = surveys[0];
  if (!survey) return [];
  return survey.questions.map((question) => ({
    id: question.id,
    surveyId: survey.id,
    question: question.prompt,
    type: surveyQuestionType(question.type),
    options: question.options,
    required: question.required,
  }));
}

export async function submitSurvey(questions: SurveyQuestion[], answers: Record<string, SurveyAnswer>) {
  const surveyId = questions[0]?.surveyId;
  if (!surveyId) throw new Error("참여 가능한 설문이 없습니다.");
  return visitorApi(`/visitor/surveys/${surveyId}/responses`, {
    method: "POST",
    body: JSON.stringify({
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    }),
  });
}
