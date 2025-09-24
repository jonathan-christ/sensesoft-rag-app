// src/server/vector/pg.ts
import { createClient } from "@/features/auth/lib/supabase/server";

import type { Database, Json } from "@/lib/database.types";

export async function storeEmbeddings(
  embeddings: number[][],
  userId: string,
  documentId: string,
  contents: string[],
  metas: Record<string, unknown>[],
): Promise<void> {
  if (
    embeddings.length !== contents.length ||
    embeddings.length !== metas.length
  ) {
    throw new Error(
      "Embeddings, contents, and metas must have the same length.",
    );
  }

  const supabase = await createClient();

  type ChunkTableInsert = Database["public"]["Tables"]["chunks"]["Insert"];

  const chunksToInsert: ChunkTableInsert[] = embeddings.map(
    (embedding, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: contents[index],
      // Supabase CLI currently models `vector` columns as `string` in the generated types.
      // At runtime the client accepts `number[]`, so we cast purely for type compatibility
      // without changing the payload we send to PostgREST.
      embedding: embedding as unknown as ChunkTableInsert["embedding"],
      meta: (metas[index] as Json | null) ?? null,
    }),
  );

  const { error } = await supabase.from("chunks").insert(chunksToInsert);

  if (error) {
    console.error("Error storing embeddings:", error);
    throw error;
  }

  console.log(
    `Stored ${embeddings.length} embeddings for document ${documentId}`,
  );
}
