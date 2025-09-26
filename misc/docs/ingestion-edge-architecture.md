# Ingestion Edge Function Architecture

## Data Flow

1. `/api/ingest` uploads the file to the `documents` storage bucket, inserts the `documents` row (`status="pending"`), and calls the `ingest` edge function (stage step) with job metadata.
2. **Stage (`ingest`)**: records a `document_jobs` row, marks the document `processing`, and dispatches the parse worker.
3. **Parse (`ingest-parse`)**: downloads the file, parses it to text, splits into chunks, and stores chunk work items in `document_chunk_jobs`.
4. **Embed (`ingest-embed`)**: processes chunk jobs in small batches, generates embeddings, writes them to `chunks`, and advances job/document progress until complete.
5. Once all chunk jobs are `completed`, the document flips to `ready`; any failure marks both the job and document `error`.

## Environment Variables

| Location          | Variables                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js API Route | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                                                                                                |
| Edge Functions    | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY` / `EDGE_SERVICE_ROLE_KEY`), `GOOGLE_GENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIM`, `STORAGE_BUCKET=documents`, optional `INGEST_CHUNK_INSERT_BATCH`, `INGEST_EMBED_BATCH_SIZE` |

## Status Lifecycle

`pending` (insert) → `processing` (stage + parse enqueue) → `ready` (all chunk jobs embedded) or `error` (any job failure).

`document_jobs.status`: `queued` → `parsing` → `chunked` → `embedding` → `completed` / `error`.

`document_chunk_jobs.status`: `queued` → `embedding` → `completed` / `error`.

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

- Stage returns `{ status: "queued", jobId }` immediately while parse/embed continue in the background.

## Error Handling

- Each step (stage/parse/embed) guards its own errors and marks the job + document `error` if something fails; the Next.js route also sets `error` if dispatch fails.
- Parse inserts chunk jobs in batches to avoid payload limits; embed processes a configurable batch size so individual invocations stay under 60s.
- Failed chunk jobs remain `status="error"` for later retry tooling.

## Security

- Only the trusted server route uses the service role key to invoke the function.
- Edge function uses service role client, so ensure RLS policies explicitly allow service role operations (already true by default).
- No realtime/webhook complexity for MVP; UI polls `/api/docs` for status.

## Open Questions

- Should we delete the storage object when ingestion fails? (Current approach keeps the file for manual reprocessing.)
- Future work: add retry queue and realtime updates.
