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

  if (!data) {
    return [];
  }

  const missingFilenameIds = Array.from(
    new Set(
      data
        .filter((chunk) => !chunk.filename || chunk.filename.trim().length === 0)
        .map((chunk) => chunk.document_id),
    ),
  );

  if (missingFilenameIds.length > 0) {
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("id, filename")
      .in("id", missingFilenameIds);

    if (docError) {
      console.warn("Failed to backfill filenames for citations", docError);
    }

    const filenameLookup = new Map(
      (documents ?? []).map((doc) => [doc.id, doc.filename ?? ""]),
    );

    return data.map((chunk) => {
      if (chunk.filename && chunk.filename.trim().length > 0) {
        return chunk;
      }

      const lookupValue = filenameLookup.get(chunk.document_id);
      const fallback = lookupValue && lookupValue.trim().length > 0
        ? lookupValue
        : chunk.document_id;

      return {
        ...chunk,
        filename: fallback,
      };
    });
  }

  return data;
}
