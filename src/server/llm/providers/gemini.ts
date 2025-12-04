import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

import type { Message } from "@/lib/types";

import {
  CHAT_MODEL,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  GOOGLE_GENAI_API_KEY,
} from "../../config";
import type { ChatStreamOptions, EmbedOptions } from "../types";

if (!GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing GOOGLE_GENAI_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);

export async function streamChat(opts: ChatStreamOptions): Promise<void> {
  const {
    messages,
    max_tokens = 2048,
    temperature = 0.7,
    onToken,
    onFinal,
    signal,
  } = opts;

  if (!messages.length) {
    throw new Error("streamChat requires at least one message");
  }

  const systemMessage = messages.find((msg) => msg.role === "system");
  const conversation = messages.filter((msg) => msg.role !== "system");

  if (!conversation.length) {
    throw new Error(
      "streamChat requires a user or assistant message to continue",
    );
  }

  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: systemMessage?.content,
    generationConfig: { maxOutputTokens: max_tokens, temperature },
  });

  const historyMessages = conversation.slice(0, -1).map((msg: Message) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: historyMessages });

  const latestMessage = conversation[conversation.length - 1];
  const result = await chat.sendMessageStream(latestMessage?.content ?? "");
  const responsePromise = result.response;

  let fullText = "";
  let chunkCount = 0;
  for await (const chunk of result.stream) {
    if (signal?.aborted) {
      console.log("[gemini] Stream aborted");
      return;
    }
    const text = chunk.text();
    fullText += text;
    chunkCount++;
    onToken(text);
  }
  console.log("[gemini] Stream complete", {
    chunkCount,
    fullTextLength: fullText.length,
  });
  let finishReason: string | undefined;
  if (onFinal) {
    try {
      const finalResponse = await responsePromise;
      finishReason = finalResponse?.candidates?.[0]?.finishReason ?? undefined;
      console.log("[gemini] Final response", { finishReason });
    } catch (responseError) {
      console.error("Failed to retrieve Gemini finish reason:", responseError);
    }
    onFinal(fullText, { finishReason });
  }
}

export async function embed(opts: EmbedOptions): Promise<number[][]> {
  const { input } = opts;
  const textInput = Array.isArray(input) ? input.join("\n\n") : input;
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent({
    content: {
      role: "user",
      parts: [{ text: textInput }],
    },
    taskType: TaskType.SEMANTIC_SIMILARITY,
  });

  const values = result.embedding?.values ?? [];
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${values.length}. Check EMBEDDING_MODEL or EMBEDDING_DIM configuration.`,
    );
  }

  return [values];
}
