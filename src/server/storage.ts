/**
 * Centralized storage bucket configuration.
 * Use these constants across Next.js API routes and reference them
 * in edge functions via the STORAGE_BUCKET env var fallback.
 */

/**
 * Bucket for document uploads (PDFs, text files, etc.).
 */
export const DOCUMENTS_BUCKET =
  process.env.DOCUMENTS_BUCKET ?? process.env.STORAGE_BUCKET ?? "documents";

/**
 * Bucket for voice message uploads.
 */
export const VOICE_MESSAGES_BUCKET =
  process.env.VOICE_MESSAGES_BUCKET ?? "voice_messages";
