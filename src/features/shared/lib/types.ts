// Supabase schema types
export interface Chat {
  id: string; // uuid
  user_id: string; // uuid
  title?: string;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface Message {
  id: string; // uuid
  chat_id: string; // uuid
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string; // timestamptz
}

export interface Document {
  id: string; // uuid
  user_id: string; // uuid
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  status: "pending" | "processing" | "ready" | "error";
  created_at: string; // timestamptz
  meta?: Json;
}

export interface Chunk {
  id: number; // bigserial
  document_id: string; // uuid
  chunk_index?: number;
  content: string;
  embedding: number[]; // vector(1536 | 3072)
  meta?: Json;
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
