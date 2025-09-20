import { streamChat as streamChatFromAdapter } from "../../../server/llm/providers/gemini";
import { StreamChatRequest, StreamChatResponse } from "../../shared/lib/types";
import { PassThrough } from "stream";

// Stream chat completion (SSE-friendly)
export async function streamChat(
  req: StreamChatRequest,
): Promise<StreamChatResponse> {
  const stream = new PassThrough();
  
  streamChatFromAdapter({
    ...req,
    model: "gemini-2.5-flash",
    onToken: (delta) => {
      stream.write(delta);
    },
    onFinal: () => {
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
