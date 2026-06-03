export const MODEL = "gemini-3.1-flash-lite";
export const TEMPERATURE = 1.0;
export const MAX_OUTPUT_TOKENS = 1024;
export const SHEET_CACHE_TTL_MS = 60_000;
export const HOLIDAYS_CACHE_TTL_MS = 60_000;
export const GEMINI_TIMEOUT_MS = 8_000;

// เวลาทำการ (Asia/Bangkok)
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 18;
export const CLOSED_WEEKDAYS = [1]; // 1 = วันจันทร์

export const DEFAULT_REPLY_OPEN =
  "ส่วนนี้น้องSora ขอให้แอดมินมาช่วยตอบนะคะ รอสักครู่นะคะ 🙏";
export const DEFAULT_REPLY_CLOSED =
  "ส่วนนี้น้องSora ขอให้แอดมินมาช่วยตอบนะคะ ตอนนี้นอกเวลาทำการ แอดมินจะตอบให้ในเวลาทำการ (จ-อา ยกเว้นวันจันทร์ 9:00–18:00) นะคะ 🙏";
