import { validateSignature, messagingApi } from "@line/bot-sdk";
import { getFaqText, getHolidays } from "@/lib/sheet";
import { callGemini } from "@/lib/gemini";
import { isWithinOpenHours } from "@/lib/hours";
import { DEFAULT_REPLY_OPEN, DEFAULT_REPLY_CLOSED } from "@/lib/config";

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

  // 3. process events (sync — completes well within LINE's 10s limit)
  const events = body.events ?? [];
  await Promise.allSettled(
    events.map(async (ev) => {
      const event = ev as Record<string, unknown>;

      // กรองเฉพาะ text message
      if (event.type !== "message") return;
      const message = event.message as Record<string, unknown>;
      if (message?.type !== "text") return;

      const replyToken = event.replyToken as string;
      const userText = (message.text as string) ?? "";

      if (userText.includes("ปุ่ม:")) return;

      // 4. ดึง FAQ + Holidays (จาก memory cache)
      const [faqCsv, holidays] = await Promise.all([getFaqText(), getHolidays()]);

      // 5. เรียก Gemini (timeout 8 วิ)
      let replyText: string | null = await callGemini(faqCsv, userText);

      // 6. ถ้า Gemini ตอบไม่ได้ → default message ตามเวลา
      if (!replyText) {
        replyText = isWithinOpenHours(holidays) ? DEFAULT_REPLY_OPEN : DEFAULT_REPLY_CLOSED;
      }

      // 7. ส่ง reply กลับ LINE
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
