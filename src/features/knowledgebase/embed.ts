import { embed as embedFromAdapter } from "../../server/llm/providers/gemini";
import { EmbedRequest, EmbedResponse } from "../shared/lib/types";

// Generate embedding
export async function embed({ text }: EmbedRequest): Promise<EmbedResponse> {
  const [embedding] = await embedFromAdapter({ input: text });
  return {
    embedding,
    model: "text-embedding-004",
    dimensions: 1536,
  };
}
