import {
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  markDocumentError,
  markJobError,
} from "../_shared/ingest.ts";

interface StagePayload {
  jobId: string;
  documentId: string;
  storagePath: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
}

async function triggerParse(jobId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-parse`, {
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
      `Failed to dispatch ingest-parse for job ${jobId}: ${response.status} ${response.statusText}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: Partial<StagePayload> | null = null;

  try {
    payload = (await req.json()) as Partial<StagePayload>;
    const { jobId, documentId, storagePath, userId, filename, mimeType, size } =
      payload;

    if (
      !jobId ||
      !documentId ||
      !storagePath ||
      !userId ||
      typeof filename !== "string" ||
      typeof mimeType !== "string" ||
      typeof size !== "number"
    ) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { error: jobInsertError } = await supabase
      .from("document_jobs")
      .insert({
        id: jobId,
        document_id: documentId,
        user_id: userId,
        storage_path: storagePath,
        filename,
        mime_type: mimeType,
        size_bytes: size,
        status: "queued",
        error: null,
      });

    if (jobInsertError) {
      console.error("Failed to insert document job", jobInsertError);
      await markDocumentError(documentId, "job_insert_failed");
      return new Response("Failed to insert job", { status: 500 });
    }

    const { data: document } = await supabase
      .from("documents")
      .select("meta")
      .eq("id", documentId)
      .single();

    const updatedMeta = {
      ...((document?.meta as Record<string, unknown> | null) ?? {}),
      storage_path: storagePath,
      job_id: jobId,
    };

    const { error: docUpdateError } = await supabase
      .from("documents")
      .update({ status: "processing", meta: updatedMeta })
      .eq("id", documentId);

    if (docUpdateError) {
      console.error(
        "Failed to update document status to processing",
        docUpdateError,
      );
      await markJobError(jobId, documentId, "document_update_failed");
      return new Response("Failed to update document", { status: 500 });
    }

    console.log(
      `ingest-stage queued job ${jobId} for document ${documentId} (${filename})`,
    );

    await triggerParse(jobId);

    return new Response(JSON.stringify({ status: "queued", jobId }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ingest-stage failed", error);
    if (payload?.jobId && payload?.documentId) {
      await markJobError(payload.jobId, payload.documentId, "stage_failed");
    } else if (payload?.documentId) {
      await markDocumentError(payload.documentId, "stage_failed");
    }
    return new Response("Internal Server Error", { status: 500 });
  }
});
