import type { ChatMessage } from "@/entities/visitor";
import { FESTIVAL_CODE, visitorApi } from "@/shared/lib/api";

export interface PersoReplyResult {
  content: string;
  sources: string[];
  safetyStatus: string;
  fallback: boolean;
  messageId: string;
}

let conversationId: string | undefined;

export async function generatePersoReply(question: string): Promise<PersoReplyResult> {
  conversationId ??= (await visitorApi<{ id: string }>("/visitor/ai/conversations", {
    method: "POST",
    body: JSON.stringify({ festivalCode: FESTIVAL_CODE, language: "ko" }),
  })).id;

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

export function resetPersoConversation() { conversationId = undefined; }

export function buildPersoMessage(
  role: ChatMessage["role"],
  content: string,
  sources?: string[],
  backendMessageId?: string,
): ChatMessage {
  return {
    id: `perso-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    backendMessageId,
    content,
    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    sources,
  };
}
