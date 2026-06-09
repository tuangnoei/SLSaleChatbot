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

const ADMIN_MODE_KEY = "admin_mode";
const ADMIN_MODE_TTL = 30 * 60; // auto-resume หลัง 30 นาที

export async function setAdminMode(): Promise<void> {
  try {
    await getRedis()?.set(ADMIN_MODE_KEY, "1", { ex: ADMIN_MODE_TTL });
  } catch (err) {
    console.error("[kv] setAdminMode error:", err);
  }
}

export async function clearAdminMode(): Promise<void> {
  try {
    await getRedis()?.del(ADMIN_MODE_KEY);
  } catch (err) {
    console.error("[kv] clearAdminMode error:", err);
  }
}

export async function isAdminMode(): Promise<boolean> {
  try {
    const val = await getRedis()?.get(ADMIN_MODE_KEY);
    return val !== null && val !== undefined;
  } catch (err) {
    console.error("[kv] isAdminMode error:", err);
    return false;
  }
}
