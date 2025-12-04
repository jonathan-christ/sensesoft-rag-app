-- Add missing INSERT policy for document_chunk_jobs
-- The service role performs ingestion, but this policy ensures
-- that if a user-level client attempts to insert, ownership is verified.

-- Note: document_chunk_jobs are typically only created by edge functions 
-- using the service role, which bypasses RLS. This policy is a safety net
-- to ensure the table follows the same pattern as other tenant tables.

CREATE POLICY "document_chunk_jobs_insert_by_owner"
  ON public.document_chunk_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunk_jobs.document_id
      AND d.user_id = auth.uid()
    )
  );

