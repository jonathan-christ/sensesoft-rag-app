import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  StreamChatRequest,
  StreamChatResponse,
} from '../shared/lib/types';

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

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
