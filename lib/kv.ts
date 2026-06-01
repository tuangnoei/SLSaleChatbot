import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const HASH_KEY = "paused_users";

export async function pauseUser(userId: string): Promise<void> {
  await redis.hset(HASH_KEY, { [userId]: Date.now().toString() });
}

export async function resumeAll(): Promise<void> {
  await redis.del(HASH_KEY);
}

export async function isUserPaused(userId: string): Promise<boolean> {
  const val = await redis.hget<string>(HASH_KEY, userId);
  return val !== null;
}
