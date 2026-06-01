import { validateSignature, messagingApi } from "@line/bot-sdk";
import { getFaqText, getHolidays } from "@/lib/sheet";
import { callGemini } from "@/lib/gemini";
import { isWithinOpenHours } from "@/lib/hours";
import { DEFAULT_REPLY_OPEN, DEFAULT_REPLY_CLOSED } from "@/lib/config";
import { pauseUser, resumeAll, isUserPaused } from "@/lib/kv";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  const signature = req.headers.get("x-line-signature") ?? "";
  const rawBody = await req.text();

  // 1. verify signature
  if (!validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET!, signature)) {
    console.warn("[webhook] invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. parse body
  let body: { events: unknown[] };
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error("[webhook] JSON parse error:", err);
    return new Response("Bad Request", { status: 400 });
  }

  // 3. process events
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

      // skip button triggers
      if (userText.includes("ปุ่ม:")) return;

      // admin commands (ส่งจาก LINE ส่วนตัวของแอดมินมาหา OA)
      const isAdmin = userId === process.env.ADMIN_LINE_USER_ID;
      if (isAdmin) {
        if (userText.includes("แอดมินยินดีดูแลลูกค้า")) {
          await resumeAll();
          console.log("[admin] resumed all paused users");
        } else if (userText.includes("แอดมินสวัสดีค่ะ")) {
          console.log("[admin] takeover signal received");
        } else {
          console.log("[admin] message from admin:", userText);
        }
        return; // ไม่ส่ง reply ให้แอดมิน
      }

      // ถ้า user อยู่ใน admin mode → เงียบ
      if (await isUserPaused(userId)) {
        console.log("[webhook] user paused, skipping:", userId);
        return;
      }

      // 4. ดึง FAQ + Holidays
      const [faqCsv, holidays] = await Promise.all([getFaqText(), getHolidays()]);

      // 5. เรียก Gemini
      let replyText: string | null = await callGemini(faqCsv, userText);

      // 6. Gemini ตอบไม่ได้ → default message + auto-pause รอแอดมิน
      if (!replyText) {
        const open = isWithinOpenHours(holidays);
        replyText = open ? DEFAULT_REPLY_OPEN : DEFAULT_REPLY_CLOSED;
        await pauseUser(userId);
        console.log("[webhook] user paused for admin:", userId);
      }

      // 7. ส่ง reply
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
