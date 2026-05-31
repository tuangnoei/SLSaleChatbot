import { GoogleGenAI } from "@google/genai";
import { MODEL, TEMPERATURE, MAX_OUTPUT_TOKENS, GEMINI_TIMEOUT_MS } from "./config";
import { buildSystemPrompt, buildUserMessage } from "./prompt";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function callGemini(
  faqCsv: string,
  userText: string
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: buildUserMessage(userText) }] }],
      config: {
        systemInstruction: buildSystemPrompt(faqCsv),
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: controller.signal,
      },
    });

    clearTimeout(timer);

    const finishReason = response.candidates?.[0]?.finishReason ?? "UNKNOWN";
    const thoughtsTokenCount = response.usageMetadata?.thoughtsTokenCount ?? 0;
    const candidatesTokenCount = response.usageMetadata?.candidatesTokenCount ?? 0;

    console.log("[gemini]", { finishReason, thoughtsTokenCount, candidatesTokenCount });

    if (finishReason === "MAX_TOKENS") {
      console.warn("[gemini] MAX_TOKENS hit — using default reply");
      return null;
    }

    const text = response.text?.trim() ?? "";
    if (!text || text.includes("NO_ANSWER")) return null;

    return text;
  } catch (err) {
    clearTimeout(timer);
    console.error("[gemini] callGemini error:", err);
    return null;
  }
}
