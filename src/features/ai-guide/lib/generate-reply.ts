import type { ChatMessage } from "@/entities/visitor";
import { ApiError, FESTIVAL_CODE, json, visitorApi, visitorSessionGeneration } from "@/shared/lib/api";
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
    conversationId = (await visitorApi<{ id: string }>("/visitor/ai/conversations", json("POST", { festivalCode: FESTIVAL_CODE, language: locale }))).id;
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
    // 답변이 어느 시점 데이터로 만들어졌는지. 서버가 안 내려주면 표시하지 않는다.
    freshnessAt?: string | null;
    // 검증된 근거로 답하지 못했을 때 서버가 채워 보내는 값.
    fallback?: { reason?: string } | null;
  }>(`/visitor/ai/conversations/${id}/messages`, json("POST", { message: question, context: { channel: "PERSO_AI", inputMode: "VOICE_OR_TEXT" } }));
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
    freshnessAt: response.freshnessAt ?? undefined,
    // 근거(출처)가 하나도 없거나 서버가 fallback을 표시하면 AI 답변만으로는 부족하다 —
    // 이때는 안내데스크·전화 같은 사람이 응대하는 채널을 함께 안내한다.
    needsFallbackChannel: Boolean(response.fallback) || response.sources.length === 0,
  };
}

export function resetConversation() {
  conversationId = undefined;
  conversationLocale = undefined;
  conversationSession = undefined;
}

export function reportAiMessage(messageId: string) {
  return visitorApi(`/visitor/ai/messages/${messageId}/reports`, json("POST", { reason: "INCORRECT_OR_UNSAFE", detail: "방문객 AI 화면에서 답변 오류 신고" }));
}

export function buildMessage(
  role: ChatMessage["role"],
  content: string,
  locale: Locale,
  extra: {
    sources?: string[];
    backendMessageId?: string;
    freshnessAt?: string;
    needsFallbackChannel?: boolean;
  } = {},
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: new Date().toLocaleTimeString(BCP47_BY_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }),
    ...extra,
  };
}
