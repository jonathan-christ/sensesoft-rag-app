import { streamChat as streamChatFromAdapter } from "../../../server/llm/providers/gemini";
import {
  StreamChatRequest,
  StreamChatResponse,
} from "../../../server/llm/types";
import { PassThrough } from "stream";
import { searchRelevantChunks } from "../../../server/rag/retrieval";
import { createClient } from "../../auth/lib/supabase/server";
import { Message } from "../../shared/lib/types";

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatRequest & { chatId?: string; topK?: number },
): Promise<StreamChatResponse> {
  const { messages, chatId, topK = 5 } = req;
  const stream = new PassThrough();
  const userQuery = messages[messages.length - 1].content;

  const chunks = await searchRelevantChunks(userQuery, topK);
  const context = chunks.map((c: any) => c.content).join("\n\n");

  const prompt = `
    You are a helpful AI assistant. Use the following context to answer the user's query. If you don't know the answer, just say that you don't know.

    Context:
    ${context}

    Query:
    ${userQuery}
  `;

  const finalMessages: Message[] = [
    {
      id: "",
      chat_id: "",
      role: "system",
      content: prompt,
      created_at: new Date().toISOString(),
    },
  ];

  let fullResponse = "";
  streamChatFromAdapter({
    ...req,
    messages: finalMessages,
    model: "gemini-2.5-flash",
    onToken: (delta: string) => {
      fullResponse += delta;
      stream.write(delta);
    },
    onFinal: async () => {
      if (chatId) {
        const supabase = await createClient();
        const { error } = await supabase.from("messages").insert([
          { chat_id: chatId, role: "user", content: userQuery },
          { chat_id: chatId, role: "assistant", content: fullResponse },
        ]);
        if (error) {
          console.error("Error saving messages:", error);
        }
      }
      stream.end();
    },
  });

  async function* streamGenerator() {
    for await (const chunk of stream) {
      yield chunk.toString();
    }
  }

  return {
    stream: streamGenerator(),
    model: "gemini-2.5-flash",
  };
}
