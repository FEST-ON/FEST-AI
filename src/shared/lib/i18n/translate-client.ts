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
