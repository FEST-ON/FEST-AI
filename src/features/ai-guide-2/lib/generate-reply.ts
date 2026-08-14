import { congestionZones, facilities, scheduleItems, transportOptions } from "@/entities/festival";
import type { ChatMessage } from "@/entities/visitor";

interface ReplyResult {
  content: string;
  sources: string[];
}

export function generatePersoReply(question: string): ReplyResult {
  const query = question.toLowerCase();

  if (/(혼잡|대기|사람)/.test(query)) {
    const busiest = [...congestionZones].sort((a, b) => b.waitMinutes - a.waitMinutes)[0];
    return {
      content: `현재 ${busiest.zone}이 가장 혼잡해요. 평균 대기는 ${busiest.waitMinutes}분이며, 여유 구역부터 둘러보시는 걸 추천드려요.`,
      sources: ["실시간 혼잡도 데이터"],
    };
  }

  if (/(주차|셔틀|버스|교통)/.test(query)) {
    return {
      content: transportOptions.map((item) => `${item.mode} · ${item.label} (${item.status})`).join("\n"),
      sources: ["운영 승인 교통정보"],
    };
  }

  if (/(화장실|수유실|구급|편의시설)/.test(query)) {
    return {
      content: facilities
        .slice(0, 3)
        .map((item) => `${item.name} · ${item.location}, 도보 ${item.walkMinutes}분`)
        .join("\n"),
      sources: ["시설 승인 데이터"],
    };
  }

  if (/(일정|공연|프로그램|오늘)/.test(query)) {
    return {
      content: scheduleItems
        .slice(0, 3)
        .map((item) => `${item.time} · ${item.title} (${item.stage})`)
        .join("\n"),
      sources: ["승인된 축제 프로그램 일정"],
    };
  }

  return {
    content: "아래 예상 질문을 선택하면 축제 운영 데이터를 기준으로 바로 안내해드릴게요.",
    sources: [],
  };
}

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
