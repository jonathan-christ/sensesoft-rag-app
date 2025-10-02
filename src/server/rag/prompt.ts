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
  "You are a helpful AI assistant. Use only the information in SOURCES to answer. If the SOURCES do not contain the answer, say you don't know. Cite each fact using the document references provided in brackets (e.g., [PDF1], [DOCX2]).";

const DEFAULT_HISTORY_PAIRS = 4;

function buildContextBlock(chunks: RetrievedChunk[]): {
  context: string;
  citations: CitationItem[];
} {
  // Group chunks by document to avoid redundant references
  const documentGroups = new Map<string, {
    chunks: RetrievedChunk[];
    filename?: string;
    reference: string;
  }>();

  // First pass: group chunks by document ID
  chunks.forEach((chunk) => {
    if (!documentGroups.has(chunk.document_id)) {
      const extension = chunk.filename?.split('.').pop()?.toUpperCase() || 'FILE';
      const referenceNumber = documentGroups.size + 1;
      documentGroups.set(chunk.document_id, {
        chunks: [],
        filename: chunk.filename,
        reference: `[${extension}${referenceNumber}]`
      });
    }
    documentGroups.get(chunk.document_id)!.chunks.push(chunk);
  });

  // Build context using the grouped chunks with single reference per document
  const contextParts: string[] = [];
  const citations: CitationItem[] = [];

  documentGroups.forEach((group) => {
    const reference = group.reference;
    // Combine all chunks from the same document under one reference
    group.chunks.forEach((chunk) => {
      contextParts.push(`${reference} ${chunk.content}`);
      citations.push({
        chunkId: chunk.chunk_id,
        documentId: chunk.document_id,
        filename: chunk.filename ?? undefined,
        similarity: chunk.similarity ?? undefined,
      });
    });
  });

  const context = contextParts.join("\n\n");
  
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
