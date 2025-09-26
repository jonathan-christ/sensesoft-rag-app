import {
  embedText,
  supabase,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from "../_shared/ingest.ts";

interface EmbedPayload {
  jobId: string;
}

const EMBED_BATCH_SIZE = Number(
  Deno.env.get("INGEST_EMBED_BATCH_SIZE") ?? "8",
);

async function markJobError(
  jobId: string,
  documentId: string,
  message: string,
) {
  await supabase
    .from("document_jobs")
    .update({ status: "error", error: message })
    .eq("id", jobId);

  await supabase
    .from("documents")
    .update({ status: "error" })
    .eq("id", documentId);
}

async function queueNextBatch(jobId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=async",
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    console.error(
      `Failed to dispatch follow-up embed job ${jobId}: ${response.status} ${response.statusText}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as Partial<EmbedPayload>;
    const { jobId } = body;

    if (!jobId) {
      return new Response("Invalid payload", { status: 400 });
    }

    const {
      data: job,
      error: jobError,
    } = await supabase
      .from("document_jobs")
      .select(
        "id, document_id, filename, mime_type, size_bytes, status, total_chunks, processed_chunks",
      )
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Document job not found", jobError);
      return new Response("Job not found", { status: 404 });
    }

    if (job.status === "error" || job.status === "completed") {
      return new Response(
        JSON.stringify({ status: job.status }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const {
      data: chunkJobs,
      error: chunkSelectError,
    } = await supabase
      .from("document_chunk_jobs")
      .select("id, chunk_index, content, status")
      .eq("document_job_id", jobId)
      .eq("status", "queued")
      .order("chunk_index", { ascending: true })
      .limit(EMBED_BATCH_SIZE);

    if (chunkSelectError) {
      console.error("Failed to fetch chunk jobs", chunkSelectError);
      await markJobError(jobId, job.document_id, "chunk_fetch_failed");
      return new Response("Chunk fetch failed", { status: 500 });
    }

    if (!chunkJobs || chunkJobs.length === 0) {
      const { count: errorCount } = await supabase
        .from("document_chunk_jobs")
        .select("id", { count: "exact", head: true })
        .eq("document_job_id", jobId)
        .eq("status", "error");

      if (errorCount && errorCount > 0) {
        await markJobError(jobId, job.document_id, "embedding_failed");
        return new Response(JSON.stringify({ status: "error" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("document_jobs")
        .update({ status: "completed", processed_chunks: job.total_chunks })
        .eq("id", jobId);

      await supabase
        .from("documents")
        .update({ status: "ready" })
        .eq("id", job.document_id);

      return new Response(JSON.stringify({ status: "completed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let completedCount = 0;

    for (const chunk of chunkJobs) {
      const startedAt = new Date().toISOString();
      await supabase
        .from("document_chunk_jobs")
        .update({ status: "embedding", updated_at: startedAt })
        .eq("id", chunk.id);

      try {
        const embedding = await embedText(chunk.content);

        const { error: insertError } = await supabase.from("chunks").insert({
          document_id: job.document_id,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          embedding,
          meta: {
            model: EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIM,
            chunk_job_id: chunk.id,
            filename: job.filename,
            mime_type: job.mime_type,
          },
        });

        if (insertError) {
          throw insertError;
        }

        const completedAt = new Date().toISOString();
        await supabase
          .from("document_chunk_jobs")
          .update({
            status: "completed",
            processed_at: completedAt,
            updated_at: completedAt,
          })
          .eq("id", chunk.id);

        completedCount += 1;
      } catch (error) {
        console.error(
          `Failed to embed chunk ${chunk.id} for job ${jobId}`,
          error,
        );
        await supabase
          .from("document_chunk_jobs")
          .update({ status: "error", error: String(error) })
          .eq("id", chunk.id);

        await markJobError(jobId, job.document_id, "embedding_failed");
        return new Response("Embedding failed", { status: 500 });
      }
    }

    if (completedCount > 0) {
      await supabase
        .from("document_jobs")
        .update({
          status: "embedding",
          processed_chunks: (job.processed_chunks ?? 0) + completedCount,
        })
        .eq("id", jobId);
    }

    const { count: remaining } = await supabase
      .from("document_chunk_jobs")
      .select("id", { count: "exact", head: true })
      .eq("document_job_id", jobId)
      .eq("status", "queued");

    if (remaining && remaining > 0) {
      await queueNextBatch(jobId);
      return new Response(JSON.stringify({ status: "embedding", remaining }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { count: errorCount } = await supabase
      .from("document_chunk_jobs")
      .select("id", { count: "exact", head: true })
      .eq("document_job_id", jobId)
      .eq("status", "error");

    if (errorCount && errorCount > 0) {
      await markJobError(jobId, job.document_id, "embedding_failed");
      return new Response(JSON.stringify({ status: "error" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("document_jobs")
      .update({ status: "completed" })
      .eq("id", jobId);

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", job.document_id);

    return new Response(JSON.stringify({ status: "completed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ingest-embed failed", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
