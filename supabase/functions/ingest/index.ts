import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { Buffer } from "node:buffer";
import {
  GoogleGenerativeAI,
  TaskType,
} from "npm:@google/generative-ai";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("EDGE_SERVICE_ROLE_KEY");
const GOOGLE_GENAI_API_KEY = Deno.env.get("GOOGLE_GENAI_API_KEY");
const EMBEDDING_MODEL =
  Deno.env.get("EMBEDDING_MODEL") ?? "gemini-embedding-001";
const EMBEDDING_DIM = Number(Deno.env.get("EMBEDDING_DIM") ?? "768");
const STORAGE_BUCKET = Deno.env.get("STORAGE_BUCKET") ?? "documents";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase URL and service role key must be set for the ingest function (SUPABASE_URL is provided by the platform, service key via SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY / EDGE_SERVICE_ROLE_KEY).",
  );
}

if (!GOOGLE_GENAI_API_KEY) {
  throw new Error("GOOGLE_GENAI_API_KEY must be set for the ingest function.");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      headers: { "X-Client-Info": "edge-function-ingest" },
    },
    auth: { persistSession: false },
  },
);

const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);

interface IngestPayload {
  documentId: string;
  storagePath: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
}

async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const { default: pdfParse } = (await import("npm:pdf-parse")) as {
      default: (data: Buffer) => Promise<{ text?: string }>;
    };
    const data = await pdfParse(buffer);
    return data.text ?? "";
  }

  if (
    mimeType === "text/markdown" ||
    mimeType === "text/plain" ||
    mimeType.startsWith("text/")
  ) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200,
): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    let chunk = text.substring(i, end);

    const lastPeriod = chunk.lastIndexOf(".");
    if (lastPeriod > -1 && lastPeriod > chunkSize * 0.8) {
      chunk = chunk.substring(0, lastPeriod + 1);
    } else {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > -1 && lastSpace > chunkSize * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
    }

    const trimmed = chunk.trim();
    if (trimmed.length > 0) {
      chunks.push(trimmed);
    }
    i += chunkSize - overlap;
    if (i >= text.length) {
      break;
    }
  }

  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: {
      role: "user",
      parts: [{ text }],
    },
    taskType: TaskType.SEMANTIC_SIMILARITY,
  });

  const values = result.embedding?.values ?? [];
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${values.length}. Check EMBEDDING_MODEL or EMBEDDING_DIM configuration.`,
    );
  }

  return values;
}

async function updateDocumentStatus(
  documentId: string,
  status: string,
) {
  const { error } = await supabase
    .from("documents")
    .update({ status })
    .eq("id", documentId);

  if (error) {
    console.error(`Failed to update document ${documentId} status to ${status}`, error);
    throw error;
  }
}

async function handleIngest(payload: IngestPayload) {
  const { documentId, storagePath, filename, mimeType, size, userId } = payload;

  await updateDocumentStatus(documentId, "processing");

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    throw downloadError || new Error("Unable to download storage object");
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const parsedText = await parseDocument(fileBuffer, mimeType);
  const chunks = chunkText(parsedText);

  console.log(
    `Generated ${chunks.length} chunks for document ${documentId} (${filename}, ${size} bytes) for user ${userId}`,
  );

  const embeddings: number[][] = [];
  const contents: string[] = [];
  const metas: Record<string, unknown>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const embedding = await embedText(chunk);
    embeddings.push(embedding);
    contents.push(chunk);
    metas.push({
      filename,
      mime_type: mimeType,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIM,
      chunk_index: i,
    });
  }

  if (embeddings.length === 0) {
    console.warn(`No embeddings generated for document ${documentId}`);
  } else {
    const inserts = embeddings.map((embedding, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: contents[index],
      embedding,
      meta: metas[index] ?? null,
    }));

    const { error: insertError } = await supabase.from("chunks").insert(inserts);
    if (insertError) {
      throw insertError;
    }
  }

  await updateDocumentStatus(documentId, "ready");
}

function validatePayload(body: unknown): IngestPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const {
    documentId,
    storagePath,
    userId,
    filename,
    mimeType,
    size,
  } = body as Record<string, unknown>;

  if (
    typeof documentId !== "string" ||
    typeof storagePath !== "string" ||
    typeof userId !== "string" ||
    typeof filename !== "string" ||
    typeof mimeType !== "string" ||
    typeof size !== "number"
  ) {
    throw new Error("Payload missing required fields");
  }

  return {
    documentId,
    storagePath,
    userId,
    filename,
    mimeType,
    size,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: IngestPayload | null = null;

  try {
    const body = await req.json();
    payload = validatePayload(body);
    await handleIngest(payload);
    return new Response(
      JSON.stringify({ status: "ready", documentId: payload.documentId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Ingest function failed", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    if (payload?.documentId) {
      try {
        await supabase
          .from("documents")
          .update({ status: "error" })
          .eq("id", payload.documentId);
      } catch (statusError) {
        console.error(
          `Failed to mark document ${payload.documentId} as error`,
          statusError,
        );
      }
    }

    return new Response(
      JSON.stringify({ status: "error", message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
