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
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string; // timestamptz
}

export interface Document {
  id: string; // uuid
  user_id: string; // uuid
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string; // timestamptz
  meta?: Record<string, any>;
}

export interface Chunk {
  id: number; // bigserial
  document_id: string; // uuid
  chunk_index?: number;
  content: string;
  embedding: number[]; // vector(1536 | 3072)
  meta?: Record<string, any>;
}

// LLM provider types
export interface EmbedRequest {
  text: string;
}

export interface EmbedResponse {
  embedding: number[];
  model: string;
  dimensions: 1536 | 3072;
}

export interface StreamChatRequest {
  messages: Message[];
  max_tokens?: number;
  temperature?: number;
}

export interface StreamChatResponse {
  stream: AsyncGenerator<string>;
  model: string;
}