# Ingestion Edge Function Architecture

## Data Flow

1. `/api/ingest` receives uploads, streams file(s) to the `documents` storage bucket with the authenticated user's credentials.
2. Route inserts a `documents` row with `status="pending"` plus metadata (`storage_path`, `job_id`).
3. Route invokes the Supabase Edge Function `ingest` using a service-role client, passing `{ documentId, storagePath, userId }`.
4. Edge function updates the document to `processing`, downloads the file from storage, parses (PDF/plain text), chunks, embeds, and upserts into `chunks`.
5. On success the function marks the document as `ready`; on any failure it stores the error in logs and marks the document as `error`.

## Environment Variables

| Location                | Variables                                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| Next.js API Route       | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIM` (passed through to function invocation if needed) |
| Supabase Edge Function  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIM`, `STORAGE_BUCKET=documents` |

## Status Lifecycle

`pending` (after insert) → `processing` (edge function starts work) → `ready` (chunks stored) or `error` (failure recorded).

## Invocation Contract

```json
{
  "documentId": "uuid",
  "storagePath": "documents/uuid-filename.pdf",
  "userId": "uuid",
  "filename": "original name",
  "mimeType": "application/pdf",
  "size": 12345
}
```

- All fields are required for logging and chunk metadata; document row already contains the same metadata, but including them allows the function to avoid additional lookups.
- The function responds with `{ status: "ready" }` on success or `{ status: "error", message }` on failure.

## Error Handling

- Edge function wraps each ingestion phase and updates `status="error"` on failure.
- Errors bubble to the caller so `/api/ingest` can surface failures during initial upload.
- Chunk upserts and embedding calls are retried per chunk (no batching) to simplify error handling.

## Security

- Only the trusted server route uses the service role key to invoke the function.
- Edge function uses service role client, so ensure RLS policies explicitly allow service role operations (already true by default).
- No realtime/webhook complexity for MVP; UI polls `/api/docs` for status.

## Open Questions

- Should we delete the storage object when ingestion fails? (Current approach keeps the file for manual reprocessing.)
- Future work: add retry queue and realtime updates.
