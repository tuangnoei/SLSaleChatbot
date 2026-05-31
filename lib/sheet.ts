import { SHEET_CACHE_TTL_MS, HOLIDAYS_CACHE_TTL_MS } from "./config";

let faqCache: { text: string; fetchedAt: number } | null = null;
let holidaysCache: { dates: Set<string>; fetchedAt: number } | null = null;

export async function getFaqText(): Promise<string> {
  const now = Date.now();
  if (faqCache && now - faqCache.fetchedAt < SHEET_CACHE_TTL_MS) {
    return faqCache.text;
  }
  try {
    const url = process.env.SHEET_CSV_URL!;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    faqCache = { text, fetchedAt: now };
    return text;
  } catch (err) {
    console.error("[sheet] getFaqText error:", err);
    if (faqCache) return faqCache.text; // stale-while-error
    return "";
  }
}

export async function getHolidays(): Promise<Set<string>> {
  const now = Date.now();
  if (holidaysCache && now - holidaysCache.fetchedAt < HOLIDAYS_CACHE_TTL_MS) {
    return holidaysCache.dates;
  }
  try {
    const url = process.env.SHEET_HOLIDAYS_CSV_URL!;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const dates = new Set(
      csv
        .split("\n")
        .slice(1) // skip header row
        .map((line) => line.split(",")[0].trim().replace(/"/g, ""))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    );
    holidaysCache = { dates, fetchedAt: now };
    return dates;
  } catch (err) {
    console.error("[sheet] getHolidays error:", err);
    if (holidaysCache) return holidaysCache.dates;
    console.warn("[sheet] getHolidays: no cache available, defaulting to empty set");
    return new Set();
  }
}
