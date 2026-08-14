import type { Locale } from "./locale";

/**
 * Calls the /api/i18n/translate route to auto-translate admin/mock-authored
 * content. Safe to call from anywhere that has `fetch` (browser or server) —
 * fails open (returns the original Korean entries) on any error so a flaky
 * translation call never breaks the page.
 */
export async function translateEntries(
  entries: Record<string, string>,
  locale: Locale,
): Promise<Record<string, string>> {
  if (locale === "ko" || Object.keys(entries).length === 0) return entries;

  try {
    const res = await fetch("/api/i18n/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, entries }),
    });
    if (!res.ok) return entries;
    const data = (await res.json()) as { entries: Record<string, string> };
    return data.entries;
  } catch {
    return entries;
  }
}

/**
 * `items`의 지정한 텍스트 필드들을 한 번의 요청으로 번역해 되돌려준다.
 * 항목별 필드를 개별 키(`${id}.${field}`)로 묶어 보내므로 호출 수는 항상 1회다.
 */
export async function translateFields<T extends { id: string }>(
  items: T[],
  fields: Array<keyof T & string>,
  locale: Locale,
): Promise<T[]> {
  if (locale === "ko" || items.length === 0) return items;
  const entries = Object.fromEntries(
    items.flatMap((item) => fields.map((field) => [`${item.id}.${field}`, String(item[field])])),
  );
  const text = await translateEntries(entries, locale);
  return items.map((item) => ({
    ...item,
    ...Object.fromEntries(fields.map((field) => [field, text[`${item.id}.${field}`] ?? item[field]])),
  }));
}
