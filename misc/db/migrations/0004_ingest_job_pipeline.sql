-- Create tables to support staged ingestion pipeline

create table if not exists public.document_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'queued',
  error text,
  total_chunks integer not null default 0,
  processed_chunks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunk_jobs (
  id uuid primary key default gen_random_uuid(),
  document_job_id uuid not null references public.document_jobs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  status text not null default 'queued',
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_jobs_document_idx on public.document_jobs (document_id);
create index if not exists document_chunk_jobs_document_job_status_idx on public.document_chunk_jobs (document_job_id, status);
create index if not exists document_chunk_jobs_document_idx on public.document_chunk_jobs (document_id);

-- simple trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_document_jobs_updated_at
  before update on public.document_jobs
  for each row
  execute procedure public.set_updated_at();

create trigger set_document_chunk_jobs_updated_at
  before update on public.document_chunk_jobs
  for each row
  execute procedure public.set_updated_at();

alter table public.document_jobs enable row level security;
alter table public.document_chunk_jobs enable row level security;

-- Service role performs ingestion so no additional RLS policies are required for client access
