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

export interface ChatStreamOptions extends StreamChatRequest {
  model: string;
  onToken: (delta: string) => void;
  onFinal?: (full: string) => void;
  signal?: AbortSignal;
}

export interface EmbedOptions {
  input: string | string[];
}
