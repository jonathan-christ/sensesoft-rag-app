# Copilot Instructions for Sensesoft RAG App

## Architecture Overview

This is a **Next.js 15 RAG (Retrieval Augmented Generation) application** with Supabase backend, designed for document chat with AI. The app uses **feature-based folder structure** where functionality is organized by domain (auth, chat, docs, shared).

### Core Tech Stack
- **Frontend**: Next.js 15 with React 19, TailwindCSS, Radix UI components
- **Backend**: Supabase (auth, database, storage, edge functions)
- **AI/ML**: Google Gemini API for chat, AssemblyAI for transcription, custom embedding pipeline
- **Build**: Turbopack, pnpm, TypeScript, ESLint + Prettier

## Key Architectural Patterns

### 1. Feature-Based Organization
```
src/features/
├── auth/         # Authentication logic
├── chat/         # RAG chat functionality  
├── docs/         # Document management
└── shared/       # Cross-feature components
```

Each feature contains `components/`, `actions/`, `lib/`, and `hooks/` subdirectories.

### 2. Supabase Integration Pattern
- **Client-side**: Use `createClient()` from `@/features/auth/lib/supabase/client`
- **Server-side**: Use `createClient()` from `@/features/auth/lib/supabase/server`
- **Middleware**: Authentication handled in `src/middleware.ts` with route protection
- **Types**: Generated types in `src/lib/database.types.ts`

### 3. RAG Pipeline Architecture
The document ingestion follows a **3-stage pipeline** via Supabase Edge Functions:
1. **Stage** (`ingest`): Upload file → mark processing → trigger parse
2. **Parse** (`ingest-parse`): Extract text → split chunks → queue embedding jobs
3. **Embed** (`ingest-embed`): Generate embeddings → store in vector database

Status lifecycle: `pending` → `processing` → `ready` (or `error`)

### 4. Streaming Chat Implementation
- Chat uses **Server-Sent Events (SSE)** via `src/app/api/chat/route.ts`
- RAG context built in `src/server/rag/prompt.ts` with citation tracking
- Gemini integration in `src/server/llm/providers/gemini.ts`

## Development Workflows

### Essential Commands
```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build with Turbopack
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format code with Prettier
```

### Authentication Flow
- Protected routes use middleware at `src/middleware.ts`
- Auth routes: `/login`, `/signup` (unprotected)
- Main app routes: `/chats`, `/docs` (protected)
- Auth state managed via Supabase client hooks

### Route Structure
- `(auth)/` - Login/signup pages (unprotected)
- `(protected)/` - Main app functionality (requires auth)
- `api/` - API routes for chat, docs, ingestion, transcription

## Project-Specific Conventions

### 1. Component Patterns
- **Shared UI**: Use components from `src/features/shared/components/ui/`
- **Feature components**: Keep feature-specific components in respective feature folders
- **Client components**: Mark with `"use client"` when using hooks/state
- **TypeScript**: Strict typing with generated Supabase types

### 2. Data Flow Patterns
- **Actions**: Server actions in `features/*/actions/` for data mutations
- **Hooks**: Custom hooks in `features/*/hooks/` for component logic
- **API Routes**: RESTful endpoints in `src/app/api/` for external integrations

### 3. Styling Conventions
- **TailwindCSS**: Primary styling approach with custom design tokens
- **Class utilities**: Use `clsx` and `tailwind-merge` for conditional classes
- **Icons**: Lucide React icons throughout the app
- **Fonts**: Geist Sans and Geist Mono (configured in layout)

### 4. Error Handling
- **API Routes**: Always wrap in try/catch with proper HTTP status codes
- **Edge Functions**: Use helper functions from `_shared/ingest.ts` for error states
- **Frontend**: Error boundaries in route segments (`error.tsx`)

## Integration Points

### Supabase Edge Functions
- Location: `supabase/functions/`
- Shared utilities: `supabase/functions/_shared/ingest.ts`
- Deploy with Supabase CLI: `supabase functions deploy`

### Environment Variables
- **Client**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Server**: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENAI_API_KEY`
- **Edge Functions**: Additional vars for embedding models and batch sizes

### Database Schema
- **Core tables**: `documents`, `chunks`, `chats`, `messages`
- **Job tracking**: `document_jobs`, `document_chunk_jobs`
- **Auth**: Managed by Supabase Auth (users table auto-generated)

## Development Tips

- **File uploads**: Use Supabase Storage with the `documents` bucket
- **Real-time**: Leverage Supabase real-time subscriptions for live updates
- **Vector search**: Use `searchRelevantChunks()` from `src/server/rag/retrieval.ts`
- **Citations**: Build citation context using `buildPrompt()` helper
- **Debugging**: Check Supabase dashboard for edge function logs and database queries

## Testing Strategy
The project currently focuses on manual testing through the UI. When adding tests:
- Use Jest/React Testing Library for components
- Test edge functions locally with Supabase CLI
- Validate RAG pipeline with sample documents