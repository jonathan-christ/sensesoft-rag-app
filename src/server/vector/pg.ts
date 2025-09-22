// src/server/vector/pg.ts
import { createClient } from "@/features/auth/lib/supabase/server";

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
    throw new Error("Embeddings, contents, and metas must have the same length.");
  }

  const supabase = await createClient();

  const chunksToInsert = embeddings.map((embedding, index) => ({
    document_id: documentId,
    chunk_index: index,
    content: contents[index],
    embedding: embedding,
    meta: metas[index],
  }));

  const { error } = await supabase.from("chunks").insert(chunksToInsert);

  if (error) {
    console.error("Error storing embeddings:", error);
    throw error;
  }

  console.log(`Stored ${embeddings.length} embeddings for document ${documentId}`);
}
