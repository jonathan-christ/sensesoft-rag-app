import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import {
  EmbedRequest,
  EmbedResponse,
  StreamChatRequest,
  StreamChatResponse,
  Chunk,
} from '../types';

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Generate embedding
export async function embed({ text }: EmbedRequest): Promise<EmbedResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return {
    embedding: result.embedding.values,
    model: 'text-embedding-004',
    dimensions: 1536,
  };
}

// Stream chat completion (SSE-friendly)
export async function streamChat({
  messages,
  max_tokens = 1000,
  temperature = 0.7,
}: StreamChatRequest): Promise<StreamChatResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { maxOutputTokens: max_tokens, temperature },
  });

  const chat = model.startChat({
    history: messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
  });

  const latestMessage = messages[messages.length - 1].content;
  const stream = await chat.sendMessageStream(latestMessage);

  async function* streamGenerator() {
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      yield text;
    }
  }

  return {
    stream: streamGenerator(),
    model: 'gemini-1.5-flash',
  };
}

// Helper: Store embedding in chunks table (for RAG)
export async function storeEmbedding(
  documentId: string,
  chunkIndex: number,
  content: string,
  embedding: number[],
): Promise<void> {
  const { error } = await supabase.from('chunks').insert({
    document_id: documentId,
    chunk_index: chunkIndex,
    content,
    embedding,
  });

  if (error) {
    throw new Error(`Failed to store chunk: ${error.message}`);
  }
}

// Helper: Search relevant chunks for RAG
export async function searchRelevantChunks(
  query: string,
  userId: string,
  limit: number = 5,
): Promise<Chunk[]> {
  const { embedding } = await embed({ text: query });
  const { data, error } = await supabase
  .from('chunks')
  .select('id, document_id, chunk_index, content, meta, embedding') // Include the 'embedding' field in the select statement
  .eq('document_id', supabase.from('documents').select('id').eq('user_id', userId))
  .order('embedding <=> :embedding', { ascending: true })
  .limit(limit)
  .eq('embedding', embedding);

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return data;
}