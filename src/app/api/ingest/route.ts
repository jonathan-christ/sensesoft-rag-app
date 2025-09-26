import { createClient } from "@/features/auth/lib/supabase/server";
import { createServiceClient } from "@/features/auth/lib/supabase/service";
import { sanitizeFileName } from "@/features/docs/lib/filename";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const supabaseService = createServiceClient();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const jobIds: string[] = [];

    for (const file of files) {
      const safeFileName = sanitizeFileName(file.name);
      const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents") // Assuming a 'documents' bucket exists
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        // Continue to next file, but log the error
        continue;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(`Error getting user for file ${file.name}:`, userError);
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

      // --- Start Ingestion Processing Logic (moved from process/[documentId]/route.ts) ---

      if (!uploadData?.path) {
        console.error(
          `Upload returned no path for file ${file.name}, skipping ingestion`,
        );
        continue;
      }

      const payload = {
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
        })
        .then((result) => {
          if (result.error) {
            console.error(
              `Edge ingest failed for document ${documentId}:`,
              result.error,
            );
            void supabaseService
              .from("documents")
              .update({ status: "error" })
              .eq("id", documentId)
              .catch((statusError) => {
                console.error(
                  `Failed to mark document ${documentId} as error after edge failure:`,
                  statusError,
                );
              });
            return;
          }

          const responseStatus =
            typeof result.data === "object" &&
            result.data !== null &&
            "status" in result.data
              ? (result.data as { status?: string }).status
              : undefined;

          if (responseStatus === "error") {
            console.error(
              `Edge ingest returned error status for document ${documentId}:`,
              result.data,
            );
            void supabaseService
              .from("documents")
              .update({ status: "error" })
              .eq("id", documentId)
              .catch((statusError) => {
                console.error(
                  `Failed to mark document ${documentId} as error after edge error response:`,
                  statusError,
                );
              });
          }
        })
        .catch((invokeError) => {
          console.error(
            `Failed to invoke ingest edge function for document ${documentId}:`,
            invokeError,
          );
          void supabaseService
            .from("documents")
            .update({ status: "error" })
            .eq("id", documentId)
            .catch((statusError) => {
              console.error(
                `Failed to mark document ${documentId} as error after invoke failure:`,
                statusError,
              );
            });
        });

      jobIds.push(jobId);
    }

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: "No files were successfully processed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ jobIds }, { status: 200 });
  } catch (error) {
    console.error("Unhandled error during file upload and processing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
