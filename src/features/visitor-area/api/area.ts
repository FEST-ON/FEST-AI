import { FESTIVAL_CODE, publicApi, visitorApi } from "@/shared/lib/api";

/**
 * VIS-12 방문객 구역 식별.
 *
 * 브라우저 위치정보는 쓰지 않는다 — 축제장 규모에서 GPS 오차가 구역 경계보다 커서 판정
 * 신뢰도가 낮고, 동의·보유·파기 부담이 추가된다. 진입 QR 지점과 방문객의 수동 선택만
 * 사용하며, 판정 결과는 서버에서 2시간 동안만 유효하다.
 */
export interface VisitorArea {
  areaId: string | null;
  areaName: string | null;
  areaSource: "QR" | "MANUAL" | null;
  areaAssignedAt: string | null;
  validHours: number;
}

export interface PublicArea {
  id: string;
  name: string;
  areaType: string;
}

export function fetchVisitorArea() {
  return visitorApi<VisitorArea>("/visitor-sessions/current/area");
}

export function fetchPublicAreas() {
  return publicApi<PublicArea[]>(`/public/festivals/${FESTIVAL_CODE}/areas`);
}

export function setVisitorArea(areaId: string | null, source: "QR" | "MANUAL" = "MANUAL") {
  return visitorApi<VisitorArea>("/visitor-sessions/current/area", {
    method: "PUT",
    body: JSON.stringify({ areaId, source }),
  });
}
