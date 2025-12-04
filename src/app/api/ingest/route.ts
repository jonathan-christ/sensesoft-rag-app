import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import { createServiceClient } from "@/features/auth/lib/supabase/service";
import { sanitizeFileName } from "@/features/docs/lib/filename";
import { badRequest, internalError, unauthorized } from "@/server/responses";
import { DOCUMENTS_BUCKET } from "@/server/storage";

export const runtime = "nodejs";

async function markDocumentStatus(
  supabaseService: ReturnType<typeof createServiceClient>,
  documentId: string,
  status: "error" | "ready" | "processing",
) {
  try {
    await supabaseService
      .from("documents")
      .update({ status })
      .eq("id", documentId);
  } catch (statusError) {
    console.error(
      `Failed to update document ${documentId} status to ${status}:`,
      statusError,
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  const supabaseService = createServiceClient();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return badRequest("No files uploaded");
    }

    const jobIds: string[] = [];

    for (const file of files) {
      const safeFileName = sanitizeFileName(file.name);
      const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        // Continue to next file, but log the error
        continue;
      }

      const jobId = crypto.randomUUID(); // Generate a job ID for each file

      // Insert document metadata into the database
      const { data: documentInsertData, error: insertError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          status: "pending",
          meta: {
            storage_path: uploadData.path,
            job_id: jobId,
          },
        })
        .select()
        .single(); // Select the inserted document to get its ID

      if (insertError || !documentInsertData) {
        console.error(
          `Error inserting document metadata for ${file.name}:`,
          insertError,
        );
        // Continue to next file, but log the error
        continue;
      }

      const documentId = documentInsertData.id;

      // --- Start Ingestion Processing Logic ---

      if (!uploadData?.path) {
        console.error(
          `Upload returned no path for file ${file.name}, skipping ingestion`,
        );
        continue;
      }

      const payload = {
        jobId,
        documentId,
        storagePath: uploadData.path,
        userId: user.id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      } as const;

      void supabaseService.functions
        .invoke("ingest", {
          body: payload,
          headers: { Prefer: "resolution=async" },
        })
        .catch((invokeError: Error) => {
          console.error(
            `Failed to invoke ingest edge function for document ${documentId}:`,
            invokeError,
          );
          void markDocumentStatus(supabaseService, documentId, "error");
        });

      jobIds.push(jobId);
    }

    if (jobIds.length === 0) {
      return internalError(
        "POST /api/ingest",
        new Error("No files were successfully processed"),
        "No files were successfully processed",
      );
    }

    return NextResponse.json({ jobIds }, { status: 200 });
  } catch (error) {
    return internalError("POST /api/ingest", error);
  }
}
