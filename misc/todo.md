# Supabase Ingestion Migration Plan

- [ ] **Clarify Requirements**
  - [ ] Inventory existing ingestion code paths (`src/app/api/ingest/route.ts`, parsers, embedding, storage helpers).
  - [ ] Confirm target Supabase project + environments, required runtime permissions, and edge function limits.
  - [ ] Identify RLS policies on `documents`, `chunks`, and storage buckets; note required service-role operations.

- [ ] **Design Updated Architecture**
  - [ ] Define new flow: Next.js uploads + job enqueue → Supabase Edge Function performs parsing/embedding → status updates.
  - [ ] Decide how to trigger the edge function (HTTP call with service key vs. background queue).
  - [ ] Map environment variables needed on the edge function (OpenAI/Gemini keys, pgvector connection string, Supabase service key).
  - [ ] Document status lifecycle (`pending` → `processing` → `ready` / `error`) and retry behavior.

- [ ] **Prepare Supabase Backend**
  - [ ] Ensure storage bucket policies permit edge function access (service role) while keeping client RLS intact.
  - [ ] Add/adjust `documents` and `chunks` RLS policies to allow service role writes without exposing client bypass.
  - [ ] (Optional) Create a jobs table or use storage metadata for backlog tracking if parallel processing is needed.

- [ ] **Implement Edge Function**
  - [ ] Scaffold `supabase/functions/ingest/index.ts` (or similar) with Deno entrypoint.
  - [ ] Ported ingestion helpers (`parsePdf`, `chunkText`, `storeEmbeddings`) directly into the edge function; remove leftover unused server utilities.
  - [ ] Implement request handler: receive storage path & document ID, download file from storage, run parsing/embedding, write chunks, update status.
  - [ ] Add robust error handling and logging (Edge Function `console.log` + Supabase logs) with clear status updates.

- [ ] **Refactor Next.js Upload Route**
  - [ ] Trim `/api/ingest` to upload files, insert `documents` row (`pending`), and invoke the edge function asynchronously.
  - [ ] Ensure client receives a quick response containing job ID / document ID for progress polling.
  - [ ] Update any polling UI to rely on `/api/docs` status updates.

- [ ] **Testing & Validation**
  - [ ] Local end-to-end dry run using Supabase local dev or staging project: upload PDF/MD, verify statuses and `chunks`.
  - [ ] Simulate failure cases (parse errors, embedding failures) and confirm `status="error"` with helpful logging.
  - [ ] Load-test with multiple concurrent uploads to validate edge function scaling and rate limits.
  - [ ] Monitor Supabase logs for storage access / RLS errors; adjust policies if needed.

- [ ] **Deployment & Monitoring**
  - [ ] Deploy edge function (`supabase functions deploy ingest`) and promote to production project.
  - [ ] Update environment variables in production (service key, vector DB connection, AI provider keys).
  - [ ] Configure alerting (Supabase logs or external monitoring) for repeated ingestion failures.
  - [ ] Document operational runbook for retries, manual reprocessing, and safe rollback path.

- [ ] **Follow-up Enhancements**
  - [ ] Consider queueing mechanism (Supabase Queues / Cron / external worker) if future scaling requires decoupling invocation.
  - [ ] Add metrics collection (e.g., ingestion duration, chunk counts).
  - [ ] Harden chunking/embedding functions for additional file types as roadmap evolves.
  - [ ] Revisit realtime/webhook updates for the Knowledgebase once the edge path is stable.
