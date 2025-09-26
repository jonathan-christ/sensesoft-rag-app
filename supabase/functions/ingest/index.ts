import {
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
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

  try {
    const payload = (await req.json()) as Partial<StagePayload>;
    const {
      jobId,
      documentId,
      storagePath,
      userId,
      filename,
      mimeType,
      size,
    } = payload;

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

    const { error: jobInsertError } = await supabase.from("document_jobs").insert({
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
      return new Response("Failed to insert job", { status: 500 });
    }

    const { data: document } = await supabase
      .from("documents")
      .select("meta")
      .eq("id", documentId)
      .single();

    const updatedMeta = {
      ...(document?.meta as Record<string, unknown> | null ?? {}),
      storage_path: storagePath,
      job_id: jobId,
    };

    const { error: docUpdateError } = await supabase
      .from("documents")
      .update({ status: "processing", meta: updatedMeta })
      .eq("id", documentId);

    if (docUpdateError) {
      console.error("Failed to update document status to processing", docUpdateError);
      return new Response("Failed to update document", { status: 500 });
    }

    await triggerParse(jobId);

    return new Response(JSON.stringify({ status: "queued", jobId }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ingest-stage failed", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
