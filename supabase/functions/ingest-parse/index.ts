import {
  Buffer,
  STORAGE_BUCKET,
  parseDocument,
  chunkText,
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  markJobError,
} from "../_shared/ingest.ts";

interface ParsePayload {
  jobId: string;
}

const CHUNK_INSERT_BATCH = Number(
  Deno.env.get("INGEST_CHUNK_INSERT_BATCH") ?? "100",
);

async function triggerEmbed(jobId: string) {
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
      `Failed to dispatch ingest-embed for job ${jobId}: ${response.status} ${response.statusText}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: Partial<ParsePayload> | null = null;
  let jobDocumentId: string | null = null;

  try {
    payload = (await req.json()) as Partial<ParsePayload>;
    const { jobId } = payload ?? {};

    if (!jobId) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("document_jobs")
      .select(
        "id, document_id, user_id, storage_path, filename, mime_type, size_bytes",
      )
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Document job not found", jobError);
      return new Response("Job not found", { status: 404 });
    }

    jobDocumentId = job.document_id;

    console.log(
      `ingest-parse processing job ${jobId} for document ${job.document_id}`,
    );

    await supabase
      .from("document_jobs")
      .update({ status: "parsing", error: null })
      .eq("id", jobId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(job.storage_path);

    if (downloadError || !fileData) {
      console.error("Failed to download storage object", downloadError);
      await markJobError(jobId, job.document_id, "download_failed");
      return new Response("Download failed", { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let parsedText: string;
    try {
      parsedText = await parseDocument(
        fileBuffer,
        job.mime_type ?? "application/octet-stream",
      );
    } catch (parseError) {
      console.error(`Failed to parse document for job ${jobId}`, parseError);
      await markJobError(jobId, job.document_id, "parse_failed");
      return new Response("Parse failed", { status: 400 });
    }

    const chunks = chunkText(parsedText);

    if (chunks.length === 0) {
      console.warn(`No chunks generated for job ${jobId}`);
      await supabase
        .from("document_jobs")
        .update({
          status: "completed",
          total_chunks: 0,
          processed_chunks: 0,
        })
        .eq("id", jobId);

      await supabase
        .from("documents")
        .update({ status: "ready" })
        .eq("id", job.document_id);

      return new Response(JSON.stringify({ status: "completed", chunks: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const chunkJobs = chunks.map((content, index) => ({
      document_job_id: jobId,
      document_id: job.document_id,
      chunk_index: index,
      content,
      status: "queued",
    }));

    for (let i = 0; i < chunkJobs.length; i += CHUNK_INSERT_BATCH) {
      const batch = chunkJobs.slice(i, i + CHUNK_INSERT_BATCH);
      const { error: insertError } = await supabase
        .from("document_chunk_jobs")
        .insert(batch);

      if (insertError) {
        console.error("Failed to insert chunk jobs", insertError);
        await markJobError(jobId, job.document_id, "chunk_insert_failed");
        return new Response("Chunk insert failed", { status: 500 });
      }
    }

    await supabase
      .from("document_jobs")
      .update({
        status: "chunked",
        total_chunks: chunkJobs.length,
        processed_chunks: 0,
      })
      .eq("id", jobId);

    console.log(
      `ingest-parse queued ${chunkJobs.length} chunks for job ${jobId}`,
    );

    await triggerEmbed(jobId);

    return new Response(
      JSON.stringify({ status: "chunked", chunks: chunkJobs.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("ingest-parse failed", error);
    if (payload?.jobId && jobDocumentId) {
      await markJobError(payload.jobId, jobDocumentId, "unexpected_error");
    }
    return new Response("Internal Server Error", { status: 500 });
  }
});
