import type { ChatMessage } from "@/entities/visitor";
import { FESTIVAL_CODE, visitorApi } from "@/shared/lib/api";
import { BCP47_BY_LOCALE } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

export interface PersoReplyResult {
  content: string;
  sources: string[];
  safetyStatus: string;
  fallback: boolean;
  messageId: string;
}

let conversationId: string | undefined;
let conversationLocale: Locale | undefined;

export async function generatePersoReply(question: string, locale: Locale = "ko"): Promise<PersoReplyResult> {
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
    safetyStatus: string;
    fallback: boolean;
    sources: Array<{ title: string; resourceType?: string }>;
  }>(`/visitor/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: question, context: { channel: "PERSO_AI", inputMode: "VOICE_OR_TEXT" } }),
  });

  return {
    content: response.answer,
    sources: response.sources.map((source) => source.title),
    safetyStatus: response.safetyStatus,
    fallback: response.fallback,
    messageId: response.messageId,
  };
}

export function resetPersoConversation() {
  conversationId = undefined;
  conversationLocale = undefined;
}

export function buildPersoMessage(
  role: ChatMessage["role"],
  content: string,
  sources?: string[],
  backendMessageId?: string,
  locale: Locale = "ko",
): ChatMessage {
  return {
    id: `perso-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    backendMessageId,
    content,
    timestamp: new Date().toLocaleTimeString(BCP47_BY_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }),
    sources,
  };
}
