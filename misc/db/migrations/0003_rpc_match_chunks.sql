-- db/migrations/0003_rpc_match_chunks.sql
-- RPC to retrieve nearest chunks for the authenticated user.
-- Ensure the dimension (vector(768)) matches public.chunks.embedding.

drop function if exists public.match_chunks(double precision[], int, float);

drop function if exists public.match_chunks(vector, int, float);

create or replace function public.match_chunks(
  query_embedding vector(768),
  match_count int,
  min_similarity float
)
returns table (
  chunk_id bigint,
  content text,
  document_id uuid,
  filename text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  with qe as (select $1 v)
  select
    c.id as chunk_id,
    c.content,
    d.id as document_id,
    d.filename,
    1 - (c.embedding <=> (select v from qe)) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where d.user_id = auth.uid()
    and (1 - (c.embedding <=> (select v from qe))) >= $3
  order by c.embedding <=> (select v from qe)
  limit $2
$$;
