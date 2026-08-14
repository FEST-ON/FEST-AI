import { FESTIVAL_CODE, json, publicApi, visitorApi } from "@/shared/lib/api";
import { surveyQuestionType } from "./model";
import type { SurveyAnswer, SurveyQuestion } from "./model";

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
  return visitorApi(`/visitor/surveys/${surveyId}/responses`, json("POST", {
    answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
  }));
}
