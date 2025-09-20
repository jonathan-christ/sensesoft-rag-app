// src/server/config.ts
export const CHAT_MODEL = process.env.CHAT_MODEL || "gemini-2.5-flash";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
export const EMBEDDING_DIM = process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM, 10) : 1536;
export const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
