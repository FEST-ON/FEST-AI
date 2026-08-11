import type { ChatMessage } from "@/entities/visitor";
import { FESTIVAL_CODE, visitorApi } from "@/shared/lib/api";

interface ReplyResult {
  content: string;
  sources: string[];
}

let conversationId: string | undefined;

export async function generateReply(question: string): Promise<ReplyResult> {
  conversationId ??= (await visitorApi<{ id: string }>("/visitor/ai/conversations", {
    method: "POST",
    body: JSON.stringify({ festivalCode: FESTIVAL_CODE, language: "ko" }),
  })).id;
  const response = await visitorApi<{
    answer: string;
    sources: Array<{ title: string }>;
  }>(`/visitor/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message: question, context: {} }),
  });
  return { content: response.answer, sources: response.sources.map((source) => source.title) };
}

export function buildMessage(role: ChatMessage["role"], content: string, sources?: string[]): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    sources,
  };
}
