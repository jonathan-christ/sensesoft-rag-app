import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import {
  EmbedRequest,
  EmbedResponse,
} from '../shared/lib/types';

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
