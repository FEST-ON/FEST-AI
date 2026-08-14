export interface ChatMessage {
  id: string;
  backendMessageId?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  question: string;
  type: "rating" | "single_choice" | "multiple_choice" | "text";
  options?: string[];
  required: boolean;
}

export type SurveyAnswer = string | number | string[];

export function surveyQuestionType(type: string): SurveyQuestion["type"] {
  const types: Record<string, SurveyQuestion["type"]> = {
    RATING: "rating",
    SINGLE_CHOICE: "single_choice",
    MULTIPLE_CHOICE: "multiple_choice",
    TEXT: "text",
  };
  const mapped = types[type];
  if (!mapped) throw new Error(`지원하지 않는 설문 질문 형식입니다: ${type}`);
  return mapped;
}

export function hasSurveyAnswer(value: SurveyAnswer | undefined) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
}

export type AccessibilityLanguage = "한국어" | "English" | "中文" | "日本語";
