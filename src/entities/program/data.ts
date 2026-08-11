import { adminApi, adminFestivalId } from "@/shared/lib/api";
import type { OperationResource } from "./model";

export const operationResources: OperationResource[] = [
  { id: "p1", category: "프로그램", name: "개막 축하공연", manager: "김민준", contact: "010-1111-2222", location: "메인스테이지", time: "9/18 19:00", status: "준비중", note: "리허설 18:00 예정" },
  { id: "p2", category: "프로그램", name: "한강 야간 드론라이트쇼", manager: "이서연", contact: "010-2222-3333", location: "한강 수상무대", time: "9/19 20:00", status: "준비중", note: "기상 상황 모니터링 중" },
  { id: "v1", category: "참여업체", name: "로컬빵집 밀도", manager: "박도현", contact: "010-3333-4444", location: "푸드존 F-3", time: "상시", status: "운영중", note: "다회용기 참여업체" },
  { id: "v2", category: "참여업체", name: "제로웨이스트 마켓 다시봄", manager: "최유나", contact: "010-4444-5555", location: "그린마켓 G-1", time: "상시", status: "운영중", note: "친환경 인증 업체" },
  { id: "b1", category: "부스", name: "업사이클링 공방 부스", manager: "정하늘", contact: "010-5555-6666", location: "체험존 A-2", time: "9/19 14:00", status: "운영중", note: "재료 재고 80%" },
  { id: "b2", category: "부스", name: "ESG 홍보관", manager: "한지민", contact: "010-6666-7777", location: "안내소 옆", time: "상시", status: "운영중", note: "설문조사 병행" },
  { id: "s1", category: "인력", name: "안전관리 요원", manager: "오세훈(팀장)", contact: "010-7777-8888", location: "전 구역 순회", time: "11:00-22:00", status: "운영중", note: "인원 12명 배치" },
  { id: "s2", category: "인력", name: "무대 진행 스태프", manager: "윤아름", contact: "010-8888-9999", location: "메인스테이지", time: "18:00-21:00", status: "준비중", note: "인원 6명" },
  { id: "vol1", category: "자원봉사자", name: "그린서포터즈 A조", manager: "이준호", contact: "010-9999-0000", location: "분리배출 스테이션", time: "11:00-15:00", status: "운영중", note: "8명 배치, 만족도 우수" },
  { id: "vol2", category: "자원봉사자", name: "그린서포터즈 B조", manager: "장서윤", contact: "010-0000-1111", location: "다회용기 회수존", time: "15:00-22:00", status: "이슈", note: "2명 결원 - 대체인력 요청" },
];

export async function fetchOperationResources() {
  const festivalId = await adminFestivalId();
  const programs = await adminApi<Array<{
    id: string; title: string; category: string; status: string; summary?: string;
  }>>(`/admin/festivals/${festivalId}/programs`);
  const statuses: Record<string, OperationResource["status"]> = {
    DRAFT: "준비중", PUBLISHED: "운영중", ENDED: "완료", ARCHIVED: "완료",
  };
  return programs.map<OperationResource>((program) => ({
    id: program.id,
    category: "프로그램",
    name: program.title,
    manager: "-",
    contact: "-",
    location: "일정에서 확인",
    time: "프로그램별 상이",
    status: statuses[program.status] ?? "준비중",
    note: program.summary ?? "",
  }));
}
