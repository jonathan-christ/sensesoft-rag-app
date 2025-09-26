import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { Buffer } from "node:buffer";
import { GoogleGenerativeAI, TaskType } from "npm:@google/generative-ai";

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
    "Supabase URL and service role key must be set for ingest functions (SUPABASE_URL is provided by the platform, service key via SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY / EDGE_SERVICE_ROLE_KEY).",
  );
}

if (!GOOGLE_GENAI_API_KEY) {
  throw new Error("GOOGLE_GENAI_API_KEY must be set for ingest functions.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    headers: { "X-Client-Info": "edge-function-ingest" },
  },
  auth: { persistSession: false },
});

const genAI = new GoogleGenerativeAI(GOOGLE_GENAI_API_KEY);

async function parseDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
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

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
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

export {
  Buffer,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  STORAGE_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  chunkText,
  embedText,
  genAI,
  parseDocument,
  supabase,
  SUPABASE_URL,
};
