import type { ChatMessage } from "@/entities/visitor";
import { FESTIVAL_CODE, visitorApi } from "@/shared/lib/api";
import { BCP47_BY_LOCALE } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

let conversationId: string | undefined;
let conversationLocale: Locale | undefined;

export async function generateReply(question: string, locale: Locale) {
  // 대화 세션은 생성 시점의 언어로 고정되므로, 언어를 바꾸면 세션을 새로 연다.
  if (conversationLocale !== locale) conversationId = undefined;
  conversationId ??= (await visitorApi<{ id: string }>("/visitor/ai/conversations", {
    method: "POST",
    body: JSON.stringify({ festivalCode: FESTIVAL_CODE, language: locale }),
  })).id;
  conversationLocale = locale;

  const response = await visitorApi<{
    messageId: string;
    answer: string;
    sources: Array<{ title: string }>;
  }>(`/visitor/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: question, context: { channel: "PERSO_AI", inputMode: "VOICE_OR_TEXT" } }),
  });

  return {
    content: response.answer,
    sources: response.sources.map((source) => source.title),
    messageId: response.messageId,
  };
}

export function resetConversation() {
  conversationId = undefined;
  conversationLocale = undefined;
}

export function reportAiMessage(messageId: string) {
  return visitorApi(`/visitor/ai/messages/${messageId}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason: "INCORRECT_OR_UNSAFE", detail: "방문객 AI 화면에서 답변 오류 신고" }),
  });
}

export function buildMessage(
  role: ChatMessage["role"],
  content: string,
  locale: Locale,
  extra: { sources?: string[]; backendMessageId?: string } = {},
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: new Date().toLocaleTimeString(BCP47_BY_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }),
    ...extra,
  };
}
