## Polishing Checklist

Issue-style overview of improvements for the RAG app. Each item has a **Problem** and a **Proposed solution**; check off as you complete them.

The list is split into **three dev-specific checklists** to keep file changes as conflict-free as possible.

---

### A. AI / Env Owner (Models, RAG, Config, DX)

Focus on server-side config, LLM behavior, RAG, and tooling/tests. These tasks mostly touch `src/server/*`, `src/lib/*`, `misc/docs/*`, and top-level tooling files.

- [ ] **Centralize env access and naming**
  - **Problem**: Environment variables are read directly in multiple places (`server/config`, `transcription`, Supabase service client, edge functions) with slightly different names/fallbacks for the same concepts.
  - **Proposed solution**: Introduce a `src/server/env.ts` (or similar) that exposes typed helpers, e.g. `getSupabaseServiceRoleKey()`, `getGoogleGenAiKey()`, `getAssemblyApiKey()`, `getEmbeddingConfig()`, `getBucketNames()`. Refactor server-side code to use these helpers and align error messages with the exact env names that are supported.

- [ ] **Avoid magic strings for models**
  - **Problem**: Model names (`"gemini-2.5-flash"`, `"gemini-embedding-001"`) are duplicated across LLM provider, RAG, and client code.
  - **Proposed solution**: Export `DEFAULT_CHAT_MODEL` / `DEFAULT_EMBEDDING_MODEL` from a single config module and use them in `llm/providers/gemini`, RAG, and any client/server call sites that reference models.

- [ ] **Document embedding dimension / DB contract**
  - **Problem**: The DB migration for `match_chunks` hardcodes `vector(768)` while `EMBEDDING_DIM` is configurable, which can drift if changed without a DB migration.
  - **Proposed solution**: Document explicitly in README and/or `misc/docs` that the embedding model + dimension must match the `chunks.embedding` column and RPC signature. Optionally add a short section on how to migrate if the embedding model changes.

- [ ] **Make `ChatStreamOptions.model` meaningful or remove it**
  - **Problem**: The Gemini provider takes a `model` in `ChatStreamOptions` but ignores it and always uses `CHAT_MODEL`, which is confusing and can hide misconfiguration.
  - **Proposed solution**: Either (a) honor the `model` field when provided (falling back to `CHAT_MODEL`), or (b) remove `model` from `ChatStreamOptions` and always derive from config. Update call sites accordingly.

- [ ] **Expose retrieval configuration more flexibly (server-side)**
  - **Problem**: Retrieval currently only exposes `topK` from the chat API and uses a fixed `minSimilarity` threshold.
  - **Proposed solution**: Allow a RAG config input (per request or per chat) that controls `topK`, `minSimilarity`, and `maxHistoryPairs` on the server side (`/api/chat`, `searchRelevantChunks`, `buildPrompt`). Coordinate with UI owner for any new client controls.

- [ ] **RAG prompt behavior tests**
  - **Problem**: Prompt building and citation grouping are central but untested.
  - **Proposed solution**: Add unit tests for `buildPrompt` (history trimming, system prompt injection, doc grouping, SOURCE formatting) using a test runner like Vitest or Jest.

- [ ] **Add initial test suite & testing tooling**
  - **Problem**: There are currently no automated tests, so core behaviors (RAG prompt building, ingestion chunking, SSE parsing) can regress silently.
  - **Proposed solution**: Introduce a simple test setup (e.g. Vitest) and start with: `buildPrompt`, `chunkText`, `parseDocument` (for text/markdown), and a happy-path test for `/api/chat` using a mocked Gemini provider.

- [ ] **Replace boilerplate README with project-specific docs**
  - **Problem**: `README.md` is still the default create-next-app readme and doesn’t explain architecture, env requirements, or ingestion behavior.
  - **Proposed solution**: Rewrite README to cover: high-level feature overview, local setup (including all env vars for Next and Supabase), how to deploy edge functions (summarizing/linking existing `misc/docs`), and an operational playbook for debugging ingestion and RAG issues.

- [ ] **Wire up `lefthook` + `lint-staged` hooks**
  - **Problem**: `lefthook` and `lint-staged` are present in `package.json` but no hook config is committed, so formatting and linting aren’t enforced on commit.
  - **Proposed solution**: Add a `lefthook.yml` to run `pnpm lint` and `pnpm format:check` (or `lint-staged`) on `pre-commit` / `pre-push`. Optionally add a short “Contributing / pre-commit” section to the README.

- [ ] **Small code cleanups (shared / server-side)**
  - **Problem**: Some flags/params are unused or misleading (e.g. `USE_REAL_BACKEND` that is always `true`).
  - **Proposed solution**: Remove or properly wire up such flags (via env if needed for mocking) and clean up unused imports/params in shared/server modules.

---

### B. Backend Owner (APIs, Supabase, Ingestion, Error Handling)

Focus on API routes, Supabase schema/RLS, ingestion pipeline, and backend runtime details. These tasks mostly touch `src/app/api/*`, `src/server/*`, `supabase/functions/*`, and Supabase SQL migrations.

- [ ] **DRY up “get authenticated Supabase client + user”**
  - **Problem**: Most API routes repeat the same boilerplate: create Supabase client, call `auth.getUser()`, 401 if missing user.
  - **Proposed solution**: Add a helper (e.g. `getUserAndClient(req)` in a `server/auth.ts` module) that returns `{ user, supabase }` or a `NextResponse` with 401. Refactor `/api/chats`, `/api/chats/[id]`, `/api/chats/[id]/messages`, `/api/docs`, `/api/docs/[id]`, `/api/ingest`, and `/api/audio/upload` to use it.

- [ ] **Confirm RLS coverage for all tenant-aware tables**
  - **Problem**: Some multi-tenant behavior relies on app-side filtering; if RLS isn’t correctly set on all tables, a buggy route could leak data across users.
  - **Proposed solution**: Verify row-level security policies for `chats`, `messages`, `documents`, `chunks`, `document_jobs`, and `document_chunk_jobs`. Ensure every table enforces `user_id = auth.uid()` (or equivalent) where appropriate, and that service-role operations used by edge functions are explicitly allowed.

- [ ] **Centralize bucket names and share between Next & edge (backend side)**
  - **Problem**: Bucket name `"documents"` and others are duplicated between Next.js API routes and edge functions.
  - **Proposed solution**: Define a single `DOCUMENTS_BUCKET` constant (or env) used in both the Next.js side (`/api/ingest`, `/api/docs/[id]`) and edge functions (via `_shared/ingest.ts`). Do the same for any other buckets (e.g. `VOICE_BUCKET`), coordinating with AI / Env for env helper usage.

- [ ] **Surface ingest progress and errors via API**
  - **Problem**: The ingestion pipeline tracks detailed status and errors (`document_jobs`, `document_chunk_jobs`), but the UI only sees a coarse `status` on `documents`.
  - **Proposed solution**: Extend `/api/docs` (and/or add a dedicated endpoint) to return a high-level progress summary (e.g. `processed_chunks / total_chunks`) and a simple error reason when a document is in `error`.

- [ ] **Explicit runtime annotations for Node-only APIs**
  - **Problem**: Some routes rely on Node APIs (`PassThrough`, `crypto.randomUUID()`), which can be sensitive to Next runtime defaults.
  - **Proposed solution**: Add `export const runtime = "nodejs"` to Node-dependent route files (e.g. `/api/chat`, `/api/ingest`) to make their runtime requirements explicit.

- [ ] **Standardize error response helpers**
  - **Problem**: Each route constructs its own `{ error: "Internal Server Error" }` shape by hand, which is repetitive and can drift.
  - **Proposed solution**: Add small helpers (e.g. `internalError(route, error)` and `unauthorized()`) to centralize logging and response shapes, then refactor routes to use them.

- [ ] **Backend-side citation persistence (optional stretch)**
  - **Problem**: RAG citations currently only exist in memory and the SSE stream; they’re not persisted with messages.
  - **Proposed solution**: Add a `citations jsonb` column (or a `message_citations` table), write citations in `stream-chat` when saving assistant messages, and return them from `/api/chats/[id]/messages` so the UI can rehydrate sources on reload.

---

### C. UI / UX Owner (Chat & Docs UI, SSE Client, Layout)

Focus on client components, hooks, and visual behavior. These tasks mostly touch `src/features/*/components`, `src/features/*/hooks`, and `src/app/*` pages.

- [ ] **Handle all SSE event types on the client**
  - **Problem**: Server stream emits `type: "sources"`, `"token"`, `"final"`, `"done"`, `"limit"`, and `"error"`, but the client currently only handles the first four and silently drops `"limit"` and `"error"`.
  - **Proposed solution**: Extend `parseSSEStream` / `useChatApp` to recognize `"limit"` and `"error"` events and surface them as structured events. When `"limit"` is received, set `_limitNotice` on the active assistant message. When `"error"` is received, set `_error` on the message and a user-facing `globalError` for the banner.

- [ ] **Extract SSE parsing into a reusable helper (client side)**
  - **Problem**: SSE parsing logic is embedded inside `useChatApp`, which makes it harder to test and reuse.
  - **Proposed solution**: Move `parseSSEStream` into a small helper (e.g. `features/chat/lib/sse.ts`) with a typed event union. Coordinate with AI / Env to keep server-side event types in sync.

- [ ] **Add lightweight polling for document status (UI layer)**
  - **Problem**: The docs page requires a manual refresh to see status changes while ingestion is running.
  - **Proposed solution**: In `useDocsPage`, add periodic polling (e.g. every 3–5 seconds) while any document is in `pending` or `processing`, falling back to manual refresh-only when all docs are `ready` or `error`. Use the progress/error fields exposed by the backend.

- [ ] **Surface ingest progress and errors in the docs UI**
  - **Problem**: Users can’t see detailed ingestion status or why a document failed.
  - **Proposed solution**: Update the documents table and related components to display progress (e.g. percentage or “x/y chunks”) and a brief error label/tool-tip when a document is in `error`.

- [ ] **Use server redirect for root route**
  - **Problem**: `src/app/page.tsx` is a client component that runs a client-side redirect to `/chats`, which causes a brief blank render.
  - **Proposed solution**: Replace the client component with a server component that calls `redirect("/chats")` from `next/navigation`, so the initial navigation is handled on the server.

- [ ] **Double-check layout height and scroll behavior**
  - **Problem**: `DocsPage` uses `h-screen` inside `SidebarShell`, which may cause nested scrollbars depending on how the shell is implemented.
  - **Proposed solution**: Standardize the app shell layout so the root sets the viewport height, and inner pages use flexbox to fill available space without their own `h-screen` declarations (or adjust `SidebarShell` accordingly).

- [ ] **UI polish for chat messages and citations**
  - **Problem**: While citations and messages work, there’s room to refine how citations are surfaced per message and across sessions.
  - **Proposed solution**: Ensure `MarkdownMessage` and `CitationsPanel` use any persisted citations from the backend; consider allowing users to click a past assistant message to focus its citations in the side panel.
