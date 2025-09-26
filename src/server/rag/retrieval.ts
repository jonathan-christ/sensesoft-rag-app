import { createClient } from "@/features/auth/lib/supabase/server";
import { embed } from "@/features/docs/actions/embed";
import type { Database } from "@/lib/database.types";

type MatchChunksArgs = Database["public"]["Functions"]["match_chunks"]["Args"];

type MatchChunksReturn =
  Database["public"]["Functions"]["match_chunks"]["Returns"][number];

export type RetrievedChunk = MatchChunksReturn;

export async function searchRelevantChunks(
  query: string,
  topK: number,
  minSimilarity = 0.5,
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();
  const { embedding } = await embed({ text: query });

  const queryEmbedding = `[${embedding.join(",")}]`;

  const rpcArgs: MatchChunksArgs = {
    query_embedding: queryEmbedding,
    match_count: topK,
    min_similarity: minSimilarity,
  };

  const { data, error } = await supabase.rpc("match_chunks", rpcArgs);

  if (error) {
    console.error("match_chunks RPC failed", error);
    return [];
  }

  return data ?? [];
}
