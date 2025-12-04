import { Message } from "@/lib/types";

// LLM provider types
export interface EmbedRequest {
  text: string;
}

export interface EmbedResponse {
  embedding: number[];
  model: string;
  dimensions: number;
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

/**
 * Options for streaming chat completion.
 * The model is determined by server config (DEFAULT_CHAT_MODEL).
 */
export interface ChatStreamOptions extends StreamChatRequest {
  onToken: (delta: string) => void;
  onFinal?: (full: string, meta?: { finishReason?: string }) => void;
  signal?: AbortSignal;
}

export interface EmbedOptions {
  input: string | string[];
}
