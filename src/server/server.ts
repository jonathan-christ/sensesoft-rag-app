import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config';

// Initialize Supabase client
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE);

// Initialize LLM providers
let openAIClient: OpenAI | undefined;
if (config.CHAT_PROVIDER === 'openai' || config.EMBEDDING_PROVIDER === 'openai') {
    openAIClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}
export const openai = openAIClient;

let googleClient: GoogleGenerativeAI | undefined;
if (config.CHAT_PROVIDER === 'gemini' || config.EMBEDDING_PROVIDER === 'gemini') {
    googleClient = new GoogleGenerativeAI(config.GOOGLE_GENAI_API_KEY as string);
}
export const google = googleClient;
