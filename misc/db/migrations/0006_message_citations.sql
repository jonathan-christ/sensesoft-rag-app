-- Add citations column to messages table for persisting RAG sources
-- This allows citations to be rehydrated when loading past conversations

ALTER TABLE public.messages
ADD COLUMN citations jsonb;

COMMENT ON COLUMN public.messages.citations IS 
'RAG citations associated with assistant messages. Array of {chunkId, documentId, filename, similarity}.';

