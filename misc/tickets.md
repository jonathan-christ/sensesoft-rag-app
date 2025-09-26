# **Milestones & Tickets (who does what)**

No time estimates here—just clear ownership \+ acceptance criteria.

## **Sprint 0 — Repo & Foundations**

- [x] ~~**T0.1 Monorepo scaffolding (Next \+ Supabase) — _Ced_**~~  
       - [x] ~~Create Next.js App Router app~~  
       - [x] ~~Add Supabase client/server, Supabase Auth helper~~  
       - [x] ~~Acceptance: can sign in/out locally; `.env.example` committed~~

- [x] ~~**T0.2 DB bootstrap (pgvector schema & policies) — _Ced_**~~  
       - [x] ~~Run migrations for `chats`, `messages`, `documents`, `chunks`~~  
       - [x] ~~Enable pgvector; create HNSW index; add RLS policies per `user_id`~~  
       - [x] ~~Acceptance: SQL applied; RLS prevents cross-user reads~~

- [x] ~~**T0.3 Provider adapters skeleton — _Fish (paired with Ced)_**~~  
       - [x] ~~`features/shared/lib/llm` with `types.ts`, `providers/gemini.ts`~~  
       - [x] ~~Implement `streamChat()`(SSE-friendly) and `embed()`~~  
       ~~`- functions should be in their respective features, these features are grouped as pages so features/chat or features/k`~~  
       - [ ] Integrate `features/knowledgebase/actions/embed.ts` into ingestion flow  
       - [ ] Acceptance: minimal unit test hits each provider (with fake keys skipped)

##

## **Sprint 1 — Chat Core (text only)**

- [ ] **T1.1 `/api/chat` SSE route — _Fish_**  
       - [x] ~~Accept `{model, messages, topK?, chatId?}`~~  
       - [x] ~~Query vector DB (no re-rank yet), build prompt, stream tokens~~  
       - [x] ~~Save messages to DB (user & assistant)~~  
       - [x] Regenerated Supabase schema types, added `match_chunks` RPC migration, and retyped retrieval/storage paths  
       - [ ] Acceptance: test page streams response; messages persisted

- [ ] **T1.2 Chat UI — _Jio_**  
       - [ ] Message list, input box, streaming display, error states  
       - [ ] Left sidebar chat list with create/rename  
       - [ ] Acceptance: create chat, send message, see streaming, switch chats

- [ ] **T1.3 Home page — _Jio_**  
       - [ ] Quick actions \+ recent chats/docs  
       - [ ] Acceptance: click-through works, auth-aware

## **Sprint 2 — Knowledge Base (uploads → RAG)**

- [ ] **T2.1 `/api/ingest` upload (multi) — _Fish_**  
       - [ ] Multipart upload to Supabase Storage, create `documents` rows  
       - [ ] Return job IDs per file  
       - [ ] Acceptance: multiple files accepted; docs show `pending`

- [ ] **T2.2 Ingestion worker (server route or lightweight worker) — _Ced_**  
       - [ ] Parse PDF/MD → chunks → embeddings → upsert `chunks`  
       - [ ] Update `documents.status` to `ready`  
       - [ ] Context: current `/api/ingest` runs the whole pipeline inline, so closing the client request aborts ingestion  
       - [ ] Plan: migrate ingestion to Supabase Edge Functions — align statuses, slim the Next.js route to upload + enqueue, build a Deno worker that downloads from Storage, parses, embeds, writes `chunks`, and updates status; trigger via direct call/queue and keep service-role access for RLS-safe writes  
       - [ ] Acceptance: upload → doc ready → chunks present; simple error handling

- [ ] **T2.3 Documents table UI — _Jio_**  
       - [ ] Paginated table with filename, status, size, date, actions (delete, reprocess)  
       - [ ] Acceptance: real data display & actions call backend

- [ ] **T2.4 Citations in chat — _Jio \+ Fish_**  
       - [ ] Show side panel of sources (doc/file, chunk snippet)  
       - [ ] Backend returns `{sources:[{document_id, filename, page?, score}]}` per answer  
       - [ ] Acceptance: clicking a citation highlights the relevant snippet

## **Sprint 3 — Polish & Voice (optional)**

- [ ] **T3.1 Simple search within documents — _Fish_**  
       - [ ] Basic keyword search (ILIKE) \+ vector search by query in `/api/docs/search`  
       - [ ] Acceptance: returns doc hits with relevance score

- [ ] **T3.2 Voice: STT endpoint — _Fish (paired with Ced)_**  
       - [ ] `POST /api/stt` accepts audio, calls Whisper or Gemini Speech  
       - [ ] Acceptance: returns transcribed text for a sample file

- [ ] **T3.3 Voice: UI controls — _Jio_**  
       - [ ] Mic button to record, send to `/api/stt`, insert transcript into chat box  
       - [ ] Speaker button (reserve for TTS later)  
       - [ ] Acceptance: record → transcribe → send

- [ ] **T3.4 Re-ranking (quality) — _Ced_**  
       - [ ] Add optional cross-encoder re-rank (server) on top-K before prompt  
       - [ ] Acceptance: toggleable; improves citation relevance on test set
