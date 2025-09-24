// Shared schema-aligned types
export interface ChatRow {
  id: string;
  title: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  _streaming?: boolean;  // true = content still being generated, false = final content received
  _error?: string;       // error message if generation failed
}

export interface Document {
  id: string;
  user_id: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  status: "pending" | "processing" | "ready" | "error";
  created_at: string;
  meta?: Json;
}

export interface Chunk {
  id: number;
  document_id: string;
  chunk_index?: number;
  content: string;
  embedding: number[];
  meta?: Json;
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
