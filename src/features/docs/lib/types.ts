export type DocumentStatus = "pending" | "processing" | "ready" | "error";

export type DocumentRow = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus | null;
  created_at: string;
  meta: Record<string, unknown> | null;
  // Progress tracking fields (from document_jobs)
  progress?: {
    processed_chunks: number;
    total_chunks: number;
  } | null;
  error_reason?: string | null;
};

/**
 * Check if any documents are in a "working" state (pending or processing).
 */
export function hasWorkingDocuments(documents: DocumentRow[]): boolean {
  return documents.some(
    (doc) => doc.status === "pending" || doc.status === "processing",
  );
}
