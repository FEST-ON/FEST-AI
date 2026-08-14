import { NextResponse } from "next/server";
import { translateEntries } from "@/shared/lib/i18n/server/translate";
import type { Locale } from "@/shared/lib/i18n/locale";

const VALID_LOCALES: Locale[] = ["ko", "en", "zh", "ja"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { locale?: string; entries?: Record<string, string> }
    | null;

  if (!body || !VALID_LOCALES.includes(body.locale as Locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  if (!body.entries || typeof body.entries !== "object") {
    return NextResponse.json({ error: "Invalid entries" }, { status: 400 });
  }

  try {
    const entries = await translateEntries(body.entries, body.locale as Locale);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Translation failed:", error);
    // Fail open: return the original (Korean) entries so the UI still renders.
    return NextResponse.json({ entries: body.entries });
  }
}
