-- Users handled by Supabase Auth; mirror to a profiles table if needed
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade,
  role text check (role in ('user','assistant','system')) not null,
  content text not null,
  created_at timestamptz default now()
);

create extension if not exists vector;
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filename text,
  mime_type text,
  size_bytes bigint,
  status text check (status in ('pending','processing','ready','error')) default 'pending',
  created_at timestamptz default now(),
  meta jsonb
);

-- one row per chunk
create table if not exists chunks (
  id bigserial primary key,
  document_id uuid references documents(id) on delete cascade,
  chunk_index integer,
  content text not null,
  embedding vector(768),  -- set to embedding dimension you choose
  meta jsonb
);
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks(document_id);
