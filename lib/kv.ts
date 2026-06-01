import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn("[kv] Redis env vars missing — admin pause disabled");
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

const PAUSE_TTL_SECONDS = 2 * 60 * 60; // auto-resume หลัง 2 ชั่วโมง
const KEY_PREFIX = "paused:";

export async function pauseUser(userId: string): Promise<void> {
  try {
    await getRedis()?.set(`${KEY_PREFIX}${userId}`, "1", { ex: PAUSE_TTL_SECONDS });
  } catch (err) {
    console.error("[kv] pauseUser error:", err);
  }
}

export async function resumeUser(userId: string): Promise<void> {
  try {
    await getRedis()?.del(`${KEY_PREFIX}${userId}`);
  } catch (err) {
    console.error("[kv] resumeUser error:", err);
  }
}

export async function resumeAll(): Promise<void> {
  // ใช้ resumeAll ผ่าน admin command (personal LINE → OA)
  // ไม่จำเป็นต้อง scan keys เพราะ TTL จัดการให้เอง
  console.log("[kv] resumeAll called — individual keys will expire via TTL");
}

export async function isUserPaused(userId: string): Promise<boolean> {
  try {
    const val = await getRedis()?.get(`${KEY_PREFIX}${userId}`);
    return val !== null && val !== undefined;
  } catch (err) {
    console.error("[kv] isUserPaused error:", err);
    return false;
  }
}
