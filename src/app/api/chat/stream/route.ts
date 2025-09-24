import { streamChat } from "@/features/chat/actions/stream-chat";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, temperature = 0.7, max_tokens = 1000 } = body;

    const response = await streamChat({
      messages,
      temperature,
      max_tokens,
    });

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response.stream) {
            // Send each chunk as SSE data
            const data = `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }

          // Send completion signal
          const doneData = `data: ${JSON.stringify({ content: "", done: true })}\n\n`;
          controller.enqueue(new TextEncoder().encode(doneData));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = `data: ${JSON.stringify({ error: "Stream failed", done: true })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
