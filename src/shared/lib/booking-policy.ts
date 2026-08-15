// 예약 취소·노쇼 기준. 방문객 화면과 운영자 호출 화면이 같은 숫자를 보여줘야 현장에서
// 말이 엇갈리지 않아, 문구가 아닌 값만 여기에 두고 각 화면이 자기 언어로 표시한다.
export const BOOKING_CANCEL_DEADLINE_MINUTES = 30;
export const BOOKING_NO_SHOW_GRACE_MINUTES = 10;

// 호출 후 유예 시간이 지났는지 — 운영자 화면에서 노쇼 처리 대상을 표시하는 데 쓴다.
export function isNoShowDue(calledAt: string | null, now = Date.now()) {
  if (!calledAt) return false;
  const called = new Date(calledAt).getTime();
  if (Number.isNaN(called)) return false;
  return now - called >= BOOKING_NO_SHOW_GRACE_MINUTES * 60_000;
}
