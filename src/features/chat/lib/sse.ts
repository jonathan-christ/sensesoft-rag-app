/**
 * SSE (Server-Sent Events) parsing utilities for chat streaming.
 *
 * Supported event types:
 * - `token`: Incremental text chunk from the AI response
 * - `sources`: Citation/source documents used for RAG
 * - `final`: Final complete message content
 * - `done`: Stream completion signal
 * - `limit`: Token limit reached warning
 * - `error`: Server-side error during generation
 */

import type { Citation } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SSETokenEvent {
  type: "token";
  delta: string;
}

export interface SSESourcesEvent {
  type: "sources";
  items: Citation[];
}

export interface SSEFinalEvent {
  type: "final";
  content: string;
}

export interface SSEDoneEvent {
  type: "done";
}

export interface SSELimitEvent {
  type: "limit";
  tokens: number;
}

export interface SSEErrorEvent {
  type: "error";
  message: string;
}

/**
 * Union of all possible SSE events from the chat stream.
 */
export type SSEEvent =
  | SSETokenEvent
  | SSESourcesEvent
  | SSEFinalEvent
  | SSEDoneEvent
  | SSELimitEvent
  | SSEErrorEvent;

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses an SSE response stream and yields typed events.
 *
 * @param response - The fetch Response object with SSE body
 * @yields {SSEEvent} Parsed events from the stream
 * @throws {Error} If the response has no body
 *
 * @example
 * ```ts
 * const response = await fetch('/api/chat', { method: 'POST', ... });
 * for await (const event of parseSSEStream(response)) {
 *   switch (event.type) {
 *     case 'token':
 *       accumulated += event.delta;
 *       break;
 *     case 'sources':
 *       setCitations(event.items);
 *       break;
 *     case 'limit':
 *       setLimitWarning(`Response limited to ${event.tokens} tokens`);
 *       break;
 *     case 'error':
 *       setError(event.message);
 *       break;
 *     case 'final':
 *       // Stream complete with final content
 *       break;
 *     case 'done':
 *       // Stream finished
 *       break;
 *   }
 * }
 * ```
 */
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const event = parseLine(line);
        if (event) {
          yield event;

          // Terminal events - stop iteration
          if (event.type === "final" || event.type === "done") {
            return;
          }
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      const event = parseLine(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parses a single SSE line into a typed event.
 */
function parseLine(line: string): SSEEvent | null {
  // Handle standard SSE "data:" prefix
  if (line.startsWith("data: ")) {
    try {
      const data = JSON.parse(line.slice(6));
      return parseEventData(data);
    } catch {
      // Invalid JSON - ignore
      return null;
    }
  }

  // Handle raw text lines (fallback for non-standard streams)
  const trimmed = line.trim();
  if (trimmed) {
    return { type: "token", delta: trimmed };
  }

  return null;
}

/**
 * Converts raw event data object to typed SSEEvent.
 */
function parseEventData(data: Record<string, unknown>): SSEEvent | null {
  const type = data.type;

  switch (type) {
    case "token":
      if (typeof data.delta === "string") {
        return { type: "token", delta: data.delta };
      }
      break;

    case "sources":
      if (Array.isArray(data.items)) {
        return {
          type: "sources",
          items: data.items as Citation[],
        };
      }
      break;

    case "final":
      if (data.message && typeof data.message === "object") {
        const message = data.message as Record<string, unknown>;
        return {
          type: "final",
          content: (message.content as string) || "",
        };
      }
      break;

    case "done":
      return { type: "done" };

    case "limit":
      return {
        type: "limit",
        tokens: typeof data.tokens === "number" ? data.tokens : 0,
      };

    case "error":
      return {
        type: "error",
        message:
          typeof data.message === "string"
            ? data.message
            : "An unknown error occurred",
      };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard to check if an event is a terminal event.
 */
export function isTerminalEvent(
  event: SSEEvent,
): event is SSEFinalEvent | SSEDoneEvent | SSEErrorEvent {
  return (
    event.type === "final" || event.type === "done" || event.type === "error"
  );
}

/**
 * Formats a limit warning message for display.
 */
export function formatLimitWarning(tokens: number): string {
  return `Response was limited to ${tokens.toLocaleString()} tokens. The answer may be incomplete.`;
}

