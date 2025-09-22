import { PassThrough } from "stream";

import { createClient } from "@/features/auth/lib/supabase/server";
import type { Message } from "@/features/shared/lib/types";
import { streamChat as streamChatFromAdapter } from "@/server/llm/providers/gemini";
import type {
  StreamChatRequest,
  StreamChatResponse,
} from "@/server/llm/types";
import { searchRelevantChunks } from "@/server/rag/retrieval";
import type { RetrievedChunk } from "@/server/rag/retrieval";

interface CitationItem {
  chunkId: number;
  documentId: string;
  filename?: string;
  similarity?: number;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant. Use only the information in SOURCES to answer. If the SOURCES do not contain the answer, say you don't know. Cite each fact with [S#].`;

function buildContextBlock(chunks: RetrievedChunk[]): {
  context: string;
  citations: CitationItem[];
} {
  const context = chunks
    .map((chunk, index) => `[S${index + 1}] ${chunk.content}`)
    .join("\n\n");

  const citations = chunks.map((chunk) => ({
    chunkId: chunk.chunk_id,
    documentId: chunk.document_id,
    filename: chunk.filename,
    similarity: chunk.similarity,
  }));

  return { context, citations };
}

function trimHistory(messages: Message[], maxPairs = 4): Message[] {
  const history = messages.slice(0, -1);
  if (history.length <= maxPairs * 2) {
    return history;
  }
  return history.slice(-maxPairs * 2);
}

function formatUserMessage(latest: Message, context: string): Message {
  return {
    ...latest,
    content: context
      ? `${latest.content}\n\nSOURCES:\n${context}`
      : latest.content,
  };
}

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatRequest & { chatId?: string; topK?: number },
): Promise<StreamChatResponse> {
  const { messages, chatId, topK = 5, ...adapterPassthrough } = req;
  const stream = new PassThrough();

  const latestMessage = messages[messages.length - 1];
  const userQuery = latestMessage?.content ?? "";

  const rawChunks = (await searchRelevantChunks(userQuery, topK)) as RetrievedChunk[];
  const { context, citations } = buildContextBlock(rawChunks);

  const sendEvent = (event: Record<string, unknown>) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (citations.length > 0) {
    sendEvent({ type: "sources", items: citations });
  }

  const systemMessage: Message = {
    id: "system",
    chat_id: latestMessage?.chat_id ?? chatId ?? "system",
    role: "system",
    content: SYSTEM_PROMPT,
    created_at: new Date().toISOString(),
  };

  const history = trimHistory(messages);
  const augmentedUserMessage = formatUserMessage(latestMessage, context);
  const llmMessages: Message[] = [systemMessage, ...history, augmentedUserMessage];

  let fullResponse = "";

  try {
    await streamChatFromAdapter({
      ...adapterPassthrough,
      messages: llmMessages,
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
