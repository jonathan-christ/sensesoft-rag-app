import { createClient } from "@/features/auth/lib/supabase/server";
import { embed } from "@/features/knowledgebase/actions/embed";

interface MatchChunksParams {
  query_embedding: number[];
  match_count: number;
  min_similarity: number;
}

export interface RetrievedChunk {
  chunk_id: number;
  content: string;
  document_id: string;
  filename?: string;
  similarity?: number;
}

export async function searchRelevantChunks(
  query: string,
  topK: number,
  minSimilarity = 0.5,
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();
  const { embedding } = await embed({ text: query });

  const rpcArgs: MatchChunksParams = {
    query_embedding: embedding,
    match_count: topK,
    min_similarity: minSimilarity,
  };

  const { data, error } = await supabase.rpc<RetrievedChunk[]>(
    "match_chunks",
    rpcArgs,
  );

  if (error) {
    console.error("match_chunks RPC failed", error);
    return [];
  }

  return data ?? [];
}
