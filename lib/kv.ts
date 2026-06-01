import { kv } from "@vercel/kv";

const HASH_KEY = "paused_users";

export async function pauseUser(userId: string): Promise<void> {
  await kv.hset(HASH_KEY, { [userId]: Date.now().toString() });
}

export async function resumeAll(): Promise<void> {
  await kv.del(HASH_KEY);
}

export async function isUserPaused(userId: string): Promise<boolean> {
  const val = await kv.hget<string>(HASH_KEY, userId);
  return val !== null;
}
