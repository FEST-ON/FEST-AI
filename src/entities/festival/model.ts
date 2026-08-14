export interface FestivalInfo {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  period: { start: string; end: string };
  hours: string;
  organizer: string;
  approvedAt: string;
  description: string;
}

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  title: string;
  stage: string;
  category: "공연" | "체험" | "전시" | "푸드" | "행사";
}

export interface FacilityInfo {
  id: string;
  name: string;
  type: "화장실" | "주차장" | "구급실" | "안내소" | "수유실" | "물품보관소";
  location: string;
  walkMinutes: number;
}

export interface TransportOption {
  id: string;
  mode: "지하철" | "버스" | "셔틀" | "주차";
  label: string;
  detail: string;
  status: "원활" | "보통" | "혼잡" | "지연";
}
