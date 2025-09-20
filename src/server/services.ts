import { config } from './config';
import { openai, google } from './server';

export function getChatClient() {
    if (config.CHAT_PROVIDER === 'openai') {
        if (!openai) throw new Error('OpenAI client not initialized');
        return openai;
    }
    if (config.CHAT_PROVIDER === 'gemini') {
        if (!google) throw new Error('Google client not initialized');
        return google.getGenerativeModel({ model: config.CHAT_MODEL });
    }
    throw new Error('Invalid chat provider');
}

export function getEmbeddingClient() {
    if (config.EMBEDDING_PROVIDER === 'openai') {
        if (!openai) throw new Error('OpenAI client not initialized');
        return openai;
    }
    if (config.EMBEDDING_PROVIDER === 'gemini') {
        if (!google) throw new Error('Google client not initialized');
        return google.getGenerativeModel({ model: config.EMBEDDING_MODEL });
    }
    throw new Error('Invalid embedding provider');
}
