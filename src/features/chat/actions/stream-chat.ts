import { PassThrough } from "stream";

import { createClient } from "@/features/auth/lib/supabase/server";
import { streamChat as streamChatFromAdapter } from "@/server/llm/providers/gemini";
import type { StreamChatRequest, StreamChatResponse } from "@/server/llm/types";
import { searchRelevantChunks } from "@/server/rag/retrieval";
import { buildPrompt } from "@/server/rag/prompt";

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatRequest & { chatId?: string; topK?: number },
): Promise<StreamChatResponse> {
  const { messages, chatId, topK = 5, ...adapterPassthrough } = req;
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
      ...adapterPassthrough,
      messages: promptMessages,
      model: "gemini-2.5-flash",
      onToken: (delta: string) => {
        fullResponse += delta;
        if (delta) {
          sendEvent({ type: "token", delta });
        }
      },
      onFinal: async (finalText: string) => {
        const messageContent = finalText || fullResponse;
        sendEvent({
          type: "final",
          message: { role: "assistant", content: messageContent },
        });

        if (chatId) {
          try {
            const supabase = await createClient();
            const { error } = await supabase.from("messages").insert([
              { chat_id: chatId, role: "user", content: userQuery },
              { chat_id: chatId, role: "assistant", content: messageContent },
            ]);
            if (error) {
              console.error("Error saving messages:", error);
            }
          } catch (dbError) {
            console.error("Error creating Supabase client:", dbError);
          }
        }

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
      yield typeof chunk === "string" ? chunk : (chunk as Buffer).toString();
    }
  }

  return {
    stream: streamGenerator(),
    model: "gemini-2.5-flash",
  };
}
