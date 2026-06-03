import { validateSignature, messagingApi } from "@line/bot-sdk";
import { getFaqText, getHolidays } from "@/lib/sheet";
import { callGemini } from "@/lib/gemini";
import { isWithinOpenHours } from "@/lib/hours";
import { DEFAULT_REPLY_OPEN, DEFAULT_REPLY_CLOSED } from "@/lib/config";
import { pauseUser, resumeUser, isUserPaused } from "@/lib/kv";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  const signature = req.headers.get("x-line-signature") ?? "";
  const rawBody = await req.text();

  if (!validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET!, signature)) {
    console.warn("[webhook] invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { events: unknown[] };
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error("[webhook] JSON parse error:", err);
    return new Response("Bad Request", { status: 400 });
  }

  const events = body.events ?? [];
  await Promise.allSettled(
    events.map(async (ev) => {
      const event = ev as Record<string, unknown>;

      if (event.type !== "message") return;
      const message = event.message as Record<string, unknown>;
      if (message?.type !== "text") return;

      const userId = (event.source as Record<string, unknown>)?.userId as string;
      const replyToken = event.replyToken as string;
      const userText = (message.text as string) ?? "";

      if (userText.includes("ปุ่ม:")) return;

      // แอดมินส่ง "แอดมินสวัสดีค่ะ" → pause ลูกค้าคนนี้
      if (userText.includes("แอดมินสวัสดีค่ะ")) {
        await pauseUser(userId);
        console.log("[webhook] admin takeover — user paused:", userId);
        return;
      }

      // แอดมินส่ง "แอดมินยินดีดูแลลูกค้า" → resume บอท
      if (userText.includes("แอดมินยินดีดูแลลูกค้า")) {
        await resumeUser(userId);
        console.log("[webhook] admin done — user resumed:", userId);
        return;
      }

      // ถ้า user อยู่ใน admin mode → เงียบ
      if (await isUserPaused(userId)) {
        console.log("[webhook] user paused, skipping:", userId);
        return;
      }

      const [faqCsv, holidays] = await Promise.all([getFaqText(), getHolidays()]);

      let replyText: string | null = await callGemini(faqCsv, userText);

      // ตอบไม่ได้ → default reply (ไม่ auto-pause)
      if (!replyText) {
        const open = isWithinOpenHours(holidays);
        replyText = open ? DEFAULT_REPLY_OPEN : DEFAULT_REPLY_CLOSED;
      }

      try {
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: replyText }],
        });
      } catch (err) {
        console.error("[webhook] replyMessage error:", err);
      }
    })
  );

  return new Response("OK", { status: 200 });
}
