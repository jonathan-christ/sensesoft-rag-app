import { streamChat } from "../../../features/chat/actions/stream-chat";
import { StreamChatRequest } from "../../../server/llm/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { chatId, messages, topK } = (await req.json()) as StreamChatRequest & {
      chatId?: string;
      topK?: number;
    };

    const { stream } = await streamChat({ chatId, messages, topK });

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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
