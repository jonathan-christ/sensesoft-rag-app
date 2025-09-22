import { NextRequest } from "next/server";
import { streamChat } from "@/features/chat/actions/stream-chat";

export async function POST(req: NextRequest) {
  const { messages, model } = await req.json();

  try {
    const { stream } = await streamChat({
      messages,
      model: model || "gemini-2.5-flash",
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const data = `data: ${JSON.stringify({ delta: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to start stream" }),
      { status: 500 }
    );
  }
}