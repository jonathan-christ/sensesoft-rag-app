import type { Message } from "@/lib/types";

import type { RetrievedChunk } from "./retrieval";

export interface CitationItem {
  chunkId: number;
  documentId: string;
  filename?: string;
  similarity?: number;
}

export interface BuildPromptOptions {
  messages: Message[];
  chunks: RetrievedChunk[];
  maxHistoryPairs?: number;
  systemPrompt?: string;
  chatId?: string;
}

export interface BuildPromptResult {
  messages: Message[];
  citations: CitationItem[];
}

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant. Use only the information in SOURCES to answer. If the SOURCES do not contain the answer, say you don't know. Cite each fact with [S#].";

const DEFAULT_HISTORY_PAIRS = 4;

function buildContextBlock(chunks: RetrievedChunk[]): {
  context: string;
  citations: CitationItem[];
} {
  const context = chunks
    .map((chunk, index) => `[S${index + 1}] ${chunk.content}`)
    .join("\n\n");

  const citations = chunks.map((chunk) => ({
    chunkId: chunk.chunk_id,
    documentId: chunk.document_id,
    filename: chunk.filename ?? undefined,
    similarity: chunk.similarity ?? undefined,
  }));

  return { context, citations };
}

function trimHistory(
  messages: Message[],
  latestMessage: Message,
  maxPairs: number,
): Message[] {
  const history = messages.filter(
    (msg) => msg !== latestMessage && msg.role !== "system",
  );
  if (history.length <= maxPairs * 2) {
    return history;
  }
  return history.slice(-maxPairs * 2);
}

function formatUserMessage(latest: Message, context: string): Message {
  return {
    ...latest,
    content: context
      ? `${latest.content}\n\nSOURCES:\n${context}`
      : latest.content,
  };
}

export function buildPrompt({
  messages,
  chunks,
  maxHistoryPairs = DEFAULT_HISTORY_PAIRS,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  chatId,
}: BuildPromptOptions): BuildPromptResult {
  if (!messages.length) {
    throw new Error("buildPrompt requires at least one message");
  }

  const latestMessage = messages[messages.length - 1];
  const { context, citations } = buildContextBlock(chunks);

  const systemMessage: Message = {
    id: "system",
    chat_id: chatId ?? latestMessage.chat_id ?? "system",
    role: "system",
    content: systemPrompt,
    created_at: new Date().toISOString(),
  };

  const history = trimHistory(messages, latestMessage, maxHistoryPairs);
  const augmentedUserMessage = formatUserMessage(latestMessage, context);

  return {
    messages: [systemMessage, ...history, augmentedUserMessage],
    citations,
  };
}

export { DEFAULT_SYSTEM_PROMPT };
