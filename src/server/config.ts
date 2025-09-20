import { z } from 'zod';

const serverSchema = z.object({
  CHAT_PROVIDER: z.enum(['openai', 'gemini']),
  EMBEDDING_PROVIDER: z.enum(['openai', 'gemini']),
  CHAT_MODEL: z.string(),
  EMBEDDING_MODEL: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE: z.string(),
}).superRefine((data, ctx) => {
    if (data.CHAT_PROVIDER === 'openai' || data.EMBEDDING_PROVIDER === 'openai') {
        if (!data.OPENAI_API_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'OPENAI_API_KEY is required when provider is openai',
                path: ['OPENAI_API_KEY'],
            });
        }
    }
    if (data.CHAT_PROVIDER === 'gemini' || data.EMBEDDING_PROVIDER === 'gemini') {
        if (!data.GOOGLE_GENAI_API_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'GOOGLE_GENAI_API_KEY is required when provider is gemini',
                path: ['GOOGLE_GENAI_API_KEY'],
            });
        }
    }
});

const serverEnv = {
    CHAT_PROVIDER: process.env.CHAT_PROVIDER,
    EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER,
    CHAT_MODEL: process.env.CHAT_MODEL,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
};

const parsedConfig = serverSchema.safeParse(serverEnv);

if (!parsedConfig.success) {
    console.error('❌ Invalid environment variables:', parsedConfig.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const config = parsedConfig.data;
