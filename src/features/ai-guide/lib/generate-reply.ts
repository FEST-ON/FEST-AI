import type { ChatMessage } from "@/entities/visitor";
import { ApiError, FESTIVAL_CODE, visitorApi, visitorSessionGeneration } from "@/shared/lib/api";
import { BCP47_BY_LOCALE } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

let conversationId: string | undefined;
let conversationLocale: Locale | undefined;
let conversationSession: number | undefined;

async function openConversation(locale: Locale) {
  // 대화 세션은 생성 시점의 언어로 고정되고 방문자 세션에 매여 있다.
  // 언어가 바뀌거나 방문자 세션이 재발급되면 이전 대화는 못 쓰므로 새로 연다.
  if (conversationLocale !== locale || conversationSession !== visitorSessionGeneration()) resetConversation();
  if (!conversationId) {
    conversationId = (await visitorApi<{ id: string }>("/visitor/ai/conversations", {
      method: "POST",
      body: JSON.stringify({ festivalCode: FESTIVAL_CODE, language: locale }),
    })).id;
    conversationLocale = locale;
    // 생성 요청 중에 세션이 갱신됐을 수 있으므로 응답 이후 값을 기록한다.
    conversationSession = visitorSessionGeneration();
  }
  return conversationId;
}

function sendMessage(id: string, question: string) {
  return visitorApi<{
    messageId: string;
    answer: string;
    sources: Array<{ title: string }>;
  }>(`/visitor/ai/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: question, context: { channel: "PERSO_AI", inputMode: "VOICE_OR_TEXT" } }),
  });
}

export async function generateReply(question: string, locale: Locale) {
  let response;
  try {
    response = await sendMessage(await openConversation(locale), question);
  } catch (error) {
    // 서버에 없는 대화(404)는 새 대화로 한 번만 복구한다 — 무한 재시도는 하지 않는다.
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    resetConversation();
    response = await sendMessage(await openConversation(locale), question);
  }

  return {
    content: response.answer,
    sources: response.sources.map((source) => source.title),
    messageId: response.messageId,
  };
}

export function resetConversation() {
  conversationId = undefined;
  conversationLocale = undefined;
  conversationSession = undefined;
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
