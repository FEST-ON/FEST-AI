import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 서울 기준 날짜+시각. 운영 화면 표기가 브라우저 타임존에 따라 흔들리지 않도록 고정한다. */
export function seoulDateTime(value: string | Date) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
}

/** 서울 기준 날짜만. 보고서 기간처럼 시각이 의미 없는 표기에 쓴다. */
export function seoulDate(value: string | Date) {
  return new Date(value).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
}

/** 서울 기준 시:분. */
export function seoulTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })
}

/** 서울 기준 월/일 시:분. */
export function seoulShort(value: string | Date) {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

/**
 * `<input type="datetime-local">`의 value 형식(YYYY-MM-DDTHH:mm)으로 만든다.
 * 이 입력은 브라우저 로컬 시간 기준이라 UTC로 밀리지 않게 오프셋을 먼저 보정한다.
 */
export function datetimeLocal(value: string | Date = new Date()) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/**
 * 같은 id의 첫 행만 남긴다.
 * 참여업체 목록은 부스마다 한 줄로 오기 때문에 업체 단위 화면에서는 대표 한 줄만 필요하다.
 */
export function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter((row) => !seen.has(row.id) && seen.add(row.id))
}
