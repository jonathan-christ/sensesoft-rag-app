# Deploying the `ingest` Edge Function with the Supabase CLI

## 1. Install and Authenticate

- Install the CLI (use any package manager; example with npm):

  ```bash
  npm install -g supabase
  ```

- Log in to Supabase. This opens a browser window for authentication:

  ```bash
  supabase login
  ```

- Link the local repo to your Supabase project (grab the `project-ref` from the dashboard URL):

  ```bash
  supabase link --project-ref <project-ref>
  ```

## 2. Prepare Runtime Secrets

Create an `.env.ingest` file (ignored by git) next to the repo root and populate it with the variables the edge function expects:

```markdown
SUPABASE_URL=
SERVICE_ROLE_KEY=
GOOGLE_GENAI_API_KEY=
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=768
STORAGE_BUCKET=documents
```

The values should mirror the environment used by `/api/ingest`. On the Next.js side we look for `SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`, or `EDGE_SERVICE_ROLE_KEY`, so choose the variant your hosting platform allows (Supabase dashboard blocks names starting with `SUPABASE_`).

## 3. Local Function Serve

Serve any of the functions locally to verify dependencies (`npm:` imports are fetched automatically by the CLI). The shared environment file works for all three functions:

```bash
supabase functions serve ingest --env-file .env.ingest
# In separate terminals you can also run:
# supabase functions serve ingest-parse --env-file .env.ingest
# supabase functions serve ingest-embed --env-file .env.ingest
```

The CLI prints a local invoke URL. While `serve` is running, uploads from `/api/ingest` will hit this local instance as long as your app points to the same Supabase project.

## 4. Push Secrets to Supabase

Once local testing succeeds, push the same secrets to the remote project:

```bash
supabase functions secrets set --env-file .env.ingest --project-ref <project-ref>
```

## 5. Deploy the Function

Deploy all ingestion workers (stage, parse, embed):

```bash
supabase functions deploy ingest --project-ref <project-ref>
supabase functions deploy ingest-parse --project-ref <project-ref>
supabase functions deploy ingest-embed --project-ref <project-ref>
```

After deployment, `/api/ingest` invokes the `ingest` (stage) function, which dispatches `ingest-parse` and `ingest-embed` in the background.

## 6. Smoke Test

- Upload a document via `/knowledgebase`.
- Confirm the `documents` row walks through `pending → processing → ready`.
- Check `public.chunks` for new embeddings and review Supabase function logs for any errors.

## 7. Troubleshooting

- If the CLI reports module import failures, ensure you are on a recent Supabase CLI version (v1.200+) and that the machine has Deno installed (the CLI prompts you if it needs to download it).
- Dashboard editor deployments won’t automatically include the shared TypeScript types; keep using the CLI so the `../../src/lib/database.types.ts` import resolves.
