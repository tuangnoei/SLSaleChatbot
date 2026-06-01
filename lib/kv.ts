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

const HASH_KEY = "paused_users";

export async function pauseUser(userId: string): Promise<void> {
  try {
    await getRedis()?.hset(HASH_KEY, { [userId]: Date.now().toString() });
  } catch (err) {
    console.error("[kv] pauseUser error:", err);
  }
}

export async function resumeAll(): Promise<void> {
  try {
    await getRedis()?.del(HASH_KEY);
  } catch (err) {
    console.error("[kv] resumeAll error:", err);
  }
}

export async function isUserPaused(userId: string): Promise<boolean> {
  try {
    const val = await getRedis()?.hget<string>(HASH_KEY, userId);
    return val !== null && val !== undefined;
  } catch (err) {
    console.error("[kv] isUserPaused error:", err);
    return false; // ถ้า Redis พัง → ให้บอทตอบต่อได้ปกติ
  }
}
