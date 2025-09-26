import { embed as embedFromAdapter } from "@/server/llm/providers/gemini";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/server/config";
import { EmbedRequest, EmbedResponse } from "@/server/llm/types";

// Generate embedding
export async function embed({ text }: EmbedRequest): Promise<EmbedResponse> {
  const [embedding] = await embedFromAdapter({ input: text });
  return {
    embedding,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIM,
  };
}
