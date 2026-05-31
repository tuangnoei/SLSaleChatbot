import { OPEN_HOUR, CLOSE_HOUR, CLOSED_WEEKDAYS } from "./config";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function isWithinOpenHours(holidays: Set<string>): boolean {
  const now = new Date();

  // ดึงทุกค่าจาก Asia/Bangkok ในครั้งเดียว — Vercel รัน UTC ถ้าไม่ทำ timezone จะเพี้ยน 7 ชม.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);

  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const dateStr = `${p.year}-${p.month}-${p.day}`;
  const hour = parseInt(p.hour, 10);
  const weekday = WEEKDAY_MAP[p.weekday] ?? -1;

  if (CLOSED_WEEKDAYS.includes(weekday)) return false;
  if (holidays.has(dateStr)) return false;
  if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) return false;
  return true;
}
