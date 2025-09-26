# Supabase Ingestion Migration Plan

- [ ] **Clarify Requirements**
  - [ ] Inventory existing ingestion code paths (`src/app/api/ingest/route.ts`, parsers, embedding, storage helpers).
  - [ ] Confirm target Supabase project + environments, required runtime permissions, and edge function limits.
  - [ ] Identify RLS policies on `documents`, `chunks`, and storage buckets; note required service-role operations.

- [x] **Design Updated Architecture**
  - [x] Define new flow: upload → job staging → parse worker → embed worker with progress updates.
  - [x] Trigger downstream workers via background edge invokes with service-role auth.
  - [x] Map required environment variables for all three functions and document lifecycle expectations.

- [ ] **Prepare Supabase Backend**
  - [ ] Ensure storage bucket policies permit edge function access (service role) while keeping client RLS intact.
  - [ ] Add/adjust `documents` and `chunks` RLS policies to allow service role writes without exposing client bypass.
  - [ ] (Optional) Create a jobs table or use storage metadata for backlog tracking if parallel processing is needed.

- [x] **Implement Edge Functions**
  - [x] Stage worker (`ingest`) enqueues jobs and dispatches downstream workers.
  - [x] Parse worker (`ingest-parse`) downloads, parses, and queues chunk jobs.
  - [x] Embed worker (`ingest-embed`) processes chunk batches, writes vectors, and finalizes statuses.
  - [x] Shared helpers module centralizes Supabase client, parsing, and embedding utilities.

- [x] **Refactor Next.js Upload Route**
  - [x] Route now uploads, inserts metadata, and dispatches the staging worker asynchronously.
  - [x] Error handling promotes failed dispatches to `status="error"` without crashing the request cycle.
  - [ ] Update UI polling to surface chunk/job progress (follow-up).

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
