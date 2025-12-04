/**
 * Centralized environment variable access for server-side code.
 * Import these helpers instead of reading process.env directly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────────────────────

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.",
    );
  }
  return url;
}

export function getSupabaseServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    process.env.EDGE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing service role key. Set SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY, or EDGE_SERVICE_ROLE_KEY.",
    );
  }
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google GenAI
// ─────────────────────────────────────────────────────────────────────────────

export function getGoogleGenAiKey(): string {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_GENAI_API_KEY environment variable.");
  }
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// AssemblyAI
// ─────────────────────────────────────────────────────────────────────────────

export function getAssemblyApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error("Missing ASSEMBLYAI_API_KEY environment variable.");
  }
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Models & Embeddings
// ─────────────────────────────────────────────────────────────────────────────

/** Default chat model for LLM completions */
export const DEFAULT_CHAT_MODEL = process.env.CHAT_MODEL ?? "gemini-2.5-flash";

/** Default embedding model for vector generation */
export const DEFAULT_EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";

/** Embedding dimension - must match DB column vector(N) and model output */
export const EMBEDDING_DIM = process.env.EMBEDDING_DIM
  ? parseInt(process.env.EMBEDDING_DIM, 10)
  : 768;

export function getEmbeddingConfig() {
  return {
    model: DEFAULT_EMBEDDING_MODEL,
    dimension: EMBEDDING_DIM,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Buckets
// ─────────────────────────────────────────────────────────────────────────────

export const DOCUMENTS_BUCKET = process.env.STORAGE_BUCKET ?? "documents";

export const VOICE_BUCKET = process.env.VOICE_BUCKET ?? "voice-recordings";

export function getBucketNames() {
  return {
    documents: DOCUMENTS_BUCKET,
    voice: VOICE_BUCKET,
  };
}
