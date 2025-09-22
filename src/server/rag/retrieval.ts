import { createClient } from "@/features/auth/lib/supabase/server";
import { embed } from "@/features/knowledgebase/actions/embed";

export async function searchRelevantChunks(
  query: string,
  topK: number,
): Promise<any[]> {
  const supabase = await createClient();
  const { embedding } = await embed({ text: query });

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: topK,
  });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
