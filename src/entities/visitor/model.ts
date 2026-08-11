export type CompanionType = "혼자" | "연인" | "가족" | "친구" | "반려동물";
export type VisitorInterest = "공연" | "체험" | "푸드" | "전시" | "쇼핑";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface CourseStop {
  order: number;
  time: string;
  title: string;
  location: string;
  note: string;
}

export interface RecommendedCourse {
  id: string;
  title: string;
  matchReason: string;
  totalMinutes: number;
  stops: CourseStop[];
}

export interface WaitTicket {
  id: string;
  program: string;
  number: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  status: "대기중" | "호출됨" | "입장완료";
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  question: string;
  type: "rating" | "choice" | "text";
  options?: string[];
  required: boolean;
}

export type AccessibilityLanguage = "한국어" | "English" | "中文" | "日本語";

export interface AccessibilitySettings {
  language: AccessibilityLanguage;
  largeText: boolean;
  voiceGuide: boolean;
}
