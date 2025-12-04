import { PassThrough } from "stream";

import { createClient } from "@/features/auth/lib/supabase/server";
import { streamChat as streamChatFromAdapter } from "@/server/llm/providers/gemini";
import type { StreamChatRequest, StreamChatResponse } from "@/server/llm/types";
import { searchRelevantChunks } from "@/server/rag/retrieval";
import { buildPrompt, CitationItem } from "@/server/rag/prompt";

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatRequest & { chatId?: string; topK?: number },
): Promise<StreamChatResponse> {
  const { messages, chatId, topK = 5, max_tokens, temperature } = req;
  const maxTokens = max_tokens ?? 2048;
  const stream = new PassThrough();

  const latestMessage = messages[messages.length - 1];
  const userQuery = latestMessage?.content ?? "";

  const rawChunks = await searchRelevantChunks(userQuery, topK);
  const { messages: promptMessages, citations } = buildPrompt({
    messages,
    chunks: rawChunks,
    chatId,
  });

  const sendEvent = (event: Record<string, unknown>) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (citations.length > 0) {
    sendEvent({ type: "sources", items: citations });
  }

  let fullResponse = "";

  try {
    await streamChatFromAdapter({
      max_tokens: maxTokens,
      temperature,
      messages: promptMessages,
      model: "gemini-2.5-flash",
      onToken: (delta: string) => {
        fullResponse += delta;
        if (delta) {
          sendEvent({ type: "token", delta });
        }
      },
      onFinal: async (finalText: string, meta) => {
        const messageContent = finalText || fullResponse;

        if (chatId) {
          try {
            const supabase = await createClient();
            const { error } = await supabase.from("messages").insert([
              {
                chat_id: chatId,
                role: "assistant",
                content: messageContent,
                citations:
                  citations.length > 0
                    ? (citations as unknown as Record<string, unknown>[])
                    : null,
              },
            ]);
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
