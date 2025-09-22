import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_MODEL,
  EMBEDDING_MODEL,
  GOOGLE_GENAI_API_KEY,
} from "../../config";
import type { Message } from "../../../features/shared/lib/types";
import type { ChatStreamOptions, EmbedOptions } from "../types";

if (!GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing GOOGLE_GENAI_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);

export async function streamChat(opts: ChatStreamOptions): Promise<void> {
  const {
    messages,
    max_tokens = 1000,
    temperature = 0.7,
    onToken,
    onFinal,
    signal,
  } = opts;

  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: { maxOutputTokens: max_tokens, temperature },
  });

  const chat = model.startChat({
    history: messages.slice(0, -1).map((msg: Message) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
  });

  const latestMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessageStream(latestMessage);

  let fullText = "";
  for await (const chunk of result.stream) {
    if (signal?.aborted) {
      return;
    }
    const text = chunk.text();
    fullText += text;
    onToken(text);
  }
  if (onFinal) {
    onFinal(fullText);
  }
}

export async function embed(opts: EmbedOptions): Promise<number[][]> {
  const { input } = opts;
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(input);
  return [result.embedding.values];
}
