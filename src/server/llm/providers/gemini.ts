import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_MODEL,
  EMBEDDING_MODEL,
  GOOGLE_GENAI_API_KEY,
} from "../../config";
import type {
  ChatStreamOptions,
  EmbedOptions,
  Message,
} from "../../../features/shared/lib/types";

if (!GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing GOOGLE_GENAI_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);

export async function streamChat(opts: ChatStreamOptions): Promise<void> {
  const {
    messages,
    max_tokens = 1000,
    temperature = 0.7,
    stream,
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

  for await (const chunk of result.stream) {
    if (signal?.aborted) {
      return;
    }
    stream.write(chunk.text());
  }
  stream.end();
}

export async function embed(opts: EmbedOptions): Promise<number[][]> {
  const { input } = opts;
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(input);
  return [result.embedding.values];
}
