import type { Message } from "@/lib/types";

import type { RetrievedChunk } from "./retrieval";

export interface CitationItem {
  chunkId: number;
  documentId: string;
  filename?: string;
  similarity?: number;
  /** Short preview of the chunk content (first ~160 chars) */
  snippet?: string;
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
  "You are a helpful AI assistant. Use only the information in SOURCES to answer. If the SOURCES do not contain the answer, say you don't know. Cite each fact using the document filename references provided in brackets (e.g., [report.pdf], [manual.docx]).";

const DEFAULT_HISTORY_PAIRS = 4;

/** Max length for reference labels */
const MAX_REFERENCE_LENGTH = 30;

/** Max length for snippet preview */
const MAX_SNIPPET_LENGTH = 160;

/**
 * Creates a clean reference label from a filename.
 * - Truncates to MAX_REFERENCE_LENGTH chars
 * - Falls back to Doc-{id} if no filename
 */
function createReferenceLabel(
  filename: string | undefined | null,
  documentId: string,
): string {
  if (!filename) {
    // Use first 8 chars of document ID as fallback
    return `Doc-${documentId.slice(0, 8)}`;
  }

  // Clean the filename - remove path if present
  const basename = filename.split(/[/\\]/).pop() || filename;

  // Truncate if too long
  if (basename.length <= MAX_REFERENCE_LENGTH) {
    return basename;
  }

  // Keep extension visible when truncating
  const lastDot = basename.lastIndexOf(".");
  if (lastDot > 0 && basename.length - lastDot <= 6) {
    const ext = basename.slice(lastDot);
    const nameWithoutExt = basename.slice(0, lastDot);
    const truncatedName = nameWithoutExt.slice(
      0,
      MAX_REFERENCE_LENGTH - ext.length - 1,
    );
    return `${truncatedName}…${ext}`;
  }

  return `${basename.slice(0, MAX_REFERENCE_LENGTH - 1)}…`;
}

/**
 * Creates a snippet preview from chunk content.
 */
function createSnippet(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_SNIPPET_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_SNIPPET_LENGTH - 1)}…`;
}

function buildContextBlock(chunks: RetrievedChunk[]): {
  context: string;
  citations: CitationItem[];
} {
  // Group chunks by document to avoid redundant references
  const documentGroups = new Map<
    string,
    {
      chunks: RetrievedChunk[];
      filename?: string;
      reference: string;
    }
  >();

  // First pass: group chunks by document ID and create filename-based references
  chunks.forEach((chunk) => {
    if (!documentGroups.has(chunk.document_id)) {
      const label = createReferenceLabel(chunk.filename, chunk.document_id);
      documentGroups.set(chunk.document_id, {
        chunks: [],
        filename: chunk.filename,
        reference: `[${label}]`,
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
        snippet: createSnippet(chunk.content),
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

export { DEFAULT_SYSTEM_PROMPT, createReferenceLabel, createSnippet };
