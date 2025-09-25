import { createClient } from "@/features/auth/lib/supabase/server";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { embed } from "@/features/knowledgebase/actions/embed";
import { storeEmbeddings } from "@/server/vector/pg"; // Import storeEmbeddings

// Simple text chunker
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    let chunk = text.substring(i, end);

    // Adjust chunk to end at a natural break (e.g., end of a sentence)
    const lastPeriod = chunk.lastIndexOf('.');
    if (lastPeriod > -1 && lastPeriod > chunkSize * 0.8) { // If a period is near the end of the chunk
      chunk = chunk.substring(0, lastPeriod + 1);
    } else {
      // If no good break, try to find a space
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > -1 && lastSpace > chunkSize * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
    }

    chunks.push(chunk.trim());
    i += chunkSize - overlap;
    if (i >= text.length) break; // Ensure we don't go past the end
  }
  return chunks.filter(c => c.length > 0);
}

async function parseDocument(fileContent: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await pdf(fileContent);
    return data.text;
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

export async function POST(
  request: Request,
  { params }: { params: { documentId: string } },
) {
  const supabase = await createClient();
  const documentId = params.documentId;

  if (!documentId) {
    return NextResponse.json(
      { error: "Document ID is required" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch document metadata
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, meta")
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      console.error(`Error fetching document ${documentId}:`, documentError);
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 },
      );
    }

    const storagePath = (document.meta as any)?.storage_path;
    if (!storagePath) {
      return NextResponse.json(
        { error: "Document storage path not found" },
        { status: 400 },
      );
    }

    // 2. Fetch the document content from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (fileError || !fileData) {
      console.error(`Error downloading file from storage:`, fileError);
      return NextResponse.json(
        { error: "Failed to download document from storage" },
        { status: 500 },
      );
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    // 3. Parse the document
    let parsedText: string;
    try {
      parsedText = await parseDocument(fileContent, document.mime_type || 'unknown_file');
    } catch (parseError) {
      console.error(`Error parsing document ${document.filename || 'unknown_file'}:`, parseError);
      return NextResponse.json(
        { error: `Failed to parse document: ${document.filename || 'unknown_file'}` },
        { status: 422 },
      );
    }

    // 4. Chunk the parsed content
    const chunks = chunkText(parsedText);
    console.log(`Generated ${chunks.length} chunks for document ${document.filename || 'unknown_file'}`);

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
        filename: document.filename || 'unknown_file',
        mime_type: document.mime_type,
        model,
        dimensions,
        chunk_index: i, // Add chunk_index here
      });
    }

    // 6. Upsert chunks into the vector database using storeEmbeddings
    if (embeddings.length > 0) {
      // Ensure user.id is available for storeEmbeddings
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error(`Error getting user for document ${document.id}:`, userError);
        return NextResponse.json(
          { error: "User not found or access denied" },
          { status: 401 },
        );
      }

      try {
        await storeEmbeddings(
          embeddings,
          user.id,
          document.id,
          chunkContents,
          chunkMetas,
        );
      } catch (upsertError) {
        console.error(`Error upserting chunks for document ${document.id}:`, upsertError);
        return NextResponse.json(
          { error: "Failed to upsert document chunks" },
          { status: 500 },
        );
      }
    } else {
      console.warn(`No chunks to upsert for document ${document.id}`);
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
      return NextResponse.json(
        { error: "Failed to update document status" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: `Document ${documentId} processed successfully` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unhandled error during document processing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
