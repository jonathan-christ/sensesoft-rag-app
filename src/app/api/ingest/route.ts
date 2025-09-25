import { createClient } from "@/features/auth/lib/supabase/server";
import { NextResponse } from "next/server";
import { embed } from "@/features/knowledgebase/actions/embed";
import { storeEmbeddings } from "@/server/vector/pg";
import { parsePdf } from "@/server/parser/pdf";
import { chunkText } from "@/server/rag/chunker";

async function parseDocument(fileContent: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return parsePdf(fileContent);
  } else if (
    mimeType === "text/markdown" ||
    mimeType === "text/plain" ||
    mimeType.startsWith("text/")
  ) {
    return fileContent.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const jobIds: string[] = [];

    for (const file of files) {
      const uniqueFileName = `${crypto.randomUUID()}-${file.name}`;
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
      const { data: documentInsertData, error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        status: "uploaded",
        meta: {
          storage_path: uploadData.path,
          job_id: jobId,
        },
      }).select().single(); // Select the inserted document to get its ID

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

      const fileBuffer = await file.arrayBuffer(); // Use the original file buffer
      const fileContent = Buffer.from(fileBuffer);

      // 3. Parse the document
      let parsedText: string;
      try {
        parsedText = await parseDocument(fileContent, file.type || 'unknown_file');
      } catch (parseError) {
        console.error(`Error parsing document ${file.name || 'unknown_file'}:`, parseError);
        // Update document status to failed if parsing fails
        await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
        continue; // Continue to next file
      }

      // 4. Chunk the parsed content
      const chunks = chunkText(parsedText);
      console.log(`Generated ${chunks.length} chunks for document ${file.name || 'unknown_file'}`);

      // 5. Generate embeddings for each chunk
      const embeddings: number[][] = [];
      const chunkContents: string[] = [];
      const chunkMetas: Record<string, unknown>[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.length === 0) continue;

        const { embedding, dimensions, model } = await embed({ text: chunk });
        embeddings.push(embedding);
        chunkContents.push(chunk);
        chunkMetas.push({
          filename: file.name || 'unknown_file',
          mime_type: file.type,
          model,
          dimensions,
          chunk_index: i,
        });
      }

      // 6. Upsert chunks into the vector database using storeEmbeddings
      if (embeddings.length > 0) {
        try {
          await storeEmbeddings(
            embeddings,
            user.id,
            documentId,
            chunkContents,
            chunkMetas,
          );
        } catch (upsertError) {
          console.error(`Error upserting chunks for document ${documentId}:`, upsertError);
          // Update document status to failed if upserting fails
          await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
          continue; // Continue to next file
        }
      } else {
        console.warn(`No chunks to upsert for document ${documentId}`);
      }

      // 7. Update document status to 'ready'
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: "ready" })
        .eq("id", documentId);

      if (updateError) {
        console.error(
          `Error updating document status for ${documentId}:`,
          updateError,
        );
        // Even if status update fails, we consider the main processing done, but log it.
      }

      // --- End Ingestion Processing Logic ---

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
