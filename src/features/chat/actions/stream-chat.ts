import { PassThrough } from "stream";

import { createClient } from "@/features/auth/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { streamChat as streamChatFromAdapter } from "@/server/llm/providers/gemini";
import type { StreamChatRequest, StreamChatResponse } from "@/server/llm/types";
import { searchRelevantChunks } from "@/server/rag/retrieval";
import { buildPrompt } from "@/server/rag/prompt";

export interface RAGConfig {
  topK?: number;
  minSimilarity?: number;
  maxHistoryPairs?: number;
}

interface StreamChatOptions extends StreamChatRequest {
  chatId?: string;
  /** @deprecated Use `rag.topK` instead */
  topK?: number;
  rag?: RAGConfig;
}

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatOptions,
): Promise<StreamChatResponse> {
  const { messages, chatId, topK, rag, max_tokens, temperature } = req;

  // Support both legacy topK and new rag config
  const effectiveTopK = rag?.topK ?? topK ?? 5;
  const minSimilarity = rag?.minSimilarity ?? 0.5;
  const maxHistoryPairs = rag?.maxHistoryPairs;

  const maxTokens = max_tokens ?? 10000;
  const stream = new PassThrough();

  const latestMessage = messages[messages.length - 1];
  const userQuery = latestMessage?.content ?? "";

  const rawChunks = await searchRelevantChunks(
    userQuery,
    effectiveTopK,
    minSimilarity,
  );
  const { messages: promptMessages, citations } = buildPrompt({
    messages,
    chunks: rawChunks,
    chatId,
    maxHistoryPairs,
  });

  const sendEvent = (event: Record<string, unknown>) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (citations.length > 0) {
    sendEvent({ type: "sources", items: citations });
  }

  let fullResponse = "";

  try {
    console.log("[stream-chat] Starting streamChatFromAdapter with", {
      messageCount: promptMessages.length,
      maxTokens,
      temperature,
    });

    await streamChatFromAdapter({
      max_tokens: maxTokens,
      temperature,
      messages: promptMessages,
      onToken: (delta: string) => {
        fullResponse += delta;
        if (delta) {
          sendEvent({ type: "token", delta });
        }
      },
      onFinal: async (finalText: string, meta) => {
        console.log("[stream-chat] onFinal called", {
          finalTextLength: finalText?.length ?? 0,
          fullResponseLength: fullResponse?.length ?? 0,
          finishReason: meta?.finishReason,
        });
        const messageContent = finalText || fullResponse;

        if (chatId) {
          try {
            const supabase = await createClient();
            const { error } = await supabase.from("messages").insert({
              chat_id: chatId,
              role: "assistant",
              content: messageContent,
              citations:
                citations.length > 0
                  ? (citations as unknown as Database["public"]["Tables"]["messages"]["Insert"]["citations"])
                  : null,
            });
            if (error) {
              console.error("Error saving messages:", error);
            }
          } catch (dbError) {
            console.error("Error creating Supabase client:", dbError);
          }
        }

        const finishReason = meta?.finishReason?.toUpperCase();
        const reachedLimit = finishReason?.includes("MAX");

        if (reachedLimit) {
          sendEvent({
            type: "limit",
            tokens: maxTokens,
          });
        }

        sendEvent({
          type: "final",
          message: { content: messageContent },
        });
        sendEvent({ type: "done" });
        stream.end();
      },
    });
  } catch (error) {
    console.error("Error during streamChat adapter call:", error);
    sendEvent({ type: "error", message: "Chat provider error." });
    sendEvent({ type: "done" });
    stream.end();
  }

  async function* streamGenerator() {
    for await (const chunk of stream) {
      if (typeof chunk === "string") {
        yield chunk;
      } else {
        yield Buffer.from(chunk).toString();
      }
    }
  }

  return {
    stream: streamGenerator(),
    model: "gemini-2.5-flash",
  };
}
