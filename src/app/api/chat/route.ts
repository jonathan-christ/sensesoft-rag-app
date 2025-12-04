import { NextRequest, NextResponse } from "next/server";

import { streamChat, RAGConfig } from "@/features/chat/actions/stream-chat";
import { StreamChatRequest } from "@/server/llm/types";

export const runtime = "nodejs";

interface ChatRequestBody extends StreamChatRequest {
  chatId?: string;
  /** @deprecated Use `rag.topK` instead */
  topK?: number;
  rag?: RAGConfig;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { chatId, messages, topK, rag, max_tokens, temperature } = body;

    // Support legacy topK param while migrating to rag config
    const ragConfig: RAGConfig = rag ?? (topK ? { topK } : {});

    const { stream } = await streamChat({
      chatId,
      messages,
      rag: ragConfig,
      max_tokens,
      temperature,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
