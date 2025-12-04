"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/features/shared/components/ui/card";
import { FileText } from "lucide-react";
import type { Citation, Message } from "@/lib/types";
import { cn } from "@/features/shared/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Inline Reference Components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Small, subtle inline reference tag that appears in message text.
 * Displays a truncated version and shows full text on hover.
 */
export function DocumentReferenceTooltip({
  reference,
  documentName,
  className = "",
}: {
  reference: string;
  documentName: string;
  className?: string;
}) {
  // Extract just the display name (remove brackets)
  const displayName = reference.replace(/^\[|\]$/g, "");

  // Tooltip shows full reference if different from document name, otherwise just document name
  const tooltipText =
    displayName !== documentName
      ? `${displayName}\n(Source: ${documentName})`
      : documentName;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm",
        "text-[10px] font-medium leading-tight",
        "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        "border border-blue-200/60 dark:border-blue-800/40",
        "hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-900/50",
        "cursor-help transition-colors",
        className,
      )}
      title={tooltipText}
    >
      <FileText className="size-2.5 flex-shrink-0 opacity-70" />
      <span className="truncate max-w-[140px]">{displayName}</span>
    </span>
  );
}

/**
 * Parse text and convert document references (e.g., `[filename.pdf]`) into
 * hoverable tooltip components.
 *
 * Handles various reference formats:
 * - Exact filename: `[Manual_v2.pdf]`
 * - Filename with context: `[IEEE Paper Review.pdf - Reviewer #4]`
 * - Doc ID fallback: `[Doc-abc12345]`
 */
export function parseDocumentReferences(
  text: string,
  citations: Citation[],
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    return [text];
  }

  // Build lists of known filenames for matching
  const knownFilenames: Array<{
    filename: string;
    documentName: string;
    documentId: string;
  }> = [];

  // Exact match map for quick lookups
  const exactMatchMap = new Map<
    string,
    { documentName: string; documentId: string }
  >();

  citations.forEach((citation) => {
    if (citation.filename) {
      // Get just the filename (no path)
      const filename = citation.filename.split("/").pop() || citation.filename;

      // Add to known filenames for partial matching
      knownFilenames.push({
        filename,
        documentName: filename,
        documentId: citation.documentId,
      });

      // Also add name without extension
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      if (nameWithoutExt !== filename) {
        knownFilenames.push({
          filename: nameWithoutExt,
          documentName: filename,
          documentId: citation.documentId,
        });
      }

      // Exact match entries
      exactMatchMap.set(`[${filename}]`, {
        documentName: filename,
        documentId: citation.documentId,
      });
      if (nameWithoutExt !== filename) {
        exactMatchMap.set(`[${nameWithoutExt}]`, {
          documentName: filename,
          documentId: citation.documentId,
        });
      }
    }

    // Fallback: handle Doc-{shortId} references
    const shortId = citation.documentId.substring(0, 8);
    exactMatchMap.set(`[Doc-${shortId}]`, {
      documentName: citation.filename || "Unknown Document",
      documentId: citation.documentId,
    });
  });

  // Sort known filenames by length (longest first) to match most specific first
  knownFilenames.sort((a, b) => b.filename.length - a.filename.length);

  /**
   * Try to find a matching document for a bracketed reference.
   * First tries exact match, then checks if any known filename is contained in the reference.
   */
  const findMatch = (
    bracketedRef: string,
  ): { documentName: string; documentId: string } | null => {
    // Try exact match first
    const exact = exactMatchMap.get(bracketedRef);
    if (exact) return exact;

    // Check if any known filename is contained in this reference
    // e.g., "[IEEE Paper Review.pdf - Reviewer #4]" contains "IEEE Paper Review.pdf"
    const innerText = bracketedRef.slice(1, -1); // Remove brackets
    for (const known of knownFilenames) {
      if (innerText.includes(known.filename)) {
        return {
          documentName: known.documentName,
          documentId: known.documentId,
        };
      }
    }

    return null;
  };

  // Pattern to match any bracketed reference [...]
  const referencePattern = /(\[[^\]]+\])/g;
  const parts = text.split(referencePattern);

  return parts.map((part, index) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      const match = findMatch(part);
      if (match) {
        return (
          <DocumentReferenceTooltip
            key={`${match.documentId}-${index}`}
            reference={part}
            documentName={match.documentName}
          />
        );
      }
    }
    return part;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Citation Aggregation Utilities
// ─────────────────────────────────────────────────────────────────────────────

export interface AggregatedDocument {
  documentId: string;
  filename?: string;
  /** Total times this document was cited across messages */
  referenceCount: number;
  /** Average similarity score across all citations */
  avgSimilarity: number;
  /** Number of messages that referenced this document */
  messageCount: number;
}

/**
 * Aggregate citations from multiple messages into unique documents with stats.
 */
export function aggregateCitations(messages: Message[]): AggregatedDocument[] {
  const docMap = new Map<
    string,
    {
      filename?: string;
      totalSimilarity: number;
      citationCount: number;
      messageIds: Set<string>;
    }
  >();

  messages.forEach((msg) => {
    if (msg.role !== "assistant" || !msg.citations?.length) return;

    msg.citations.forEach((citation) => {
      const existing = docMap.get(citation.documentId);
      if (existing) {
        existing.totalSimilarity += citation.similarity || 0;
        existing.citationCount++;
        existing.messageIds.add(msg.id);
        // Update filename if we didn't have one
        if (!existing.filename && citation.filename) {
          existing.filename = citation.filename;
        }
      } else {
        docMap.set(citation.documentId, {
          filename: citation.filename,
          totalSimilarity: citation.similarity || 0,
          citationCount: 1,
          messageIds: new Set([msg.id]),
        });
      }
    });
  });

  return Array.from(docMap.entries())
    .map(([documentId, data]) => ({
      documentId,
      filename: data.filename,
      referenceCount: data.citationCount,
      avgSimilarity:
        data.citationCount > 0 ? data.totalSimilarity / data.citationCount : 0,
      messageCount: data.messageIds.size,
    }))
    .sort((a, b) => b.referenceCount - a.referenceCount); // Most referenced first
}

// ─────────────────────────────────────────────────────────────────────────────
// Citations Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface CitationsPanelProps {
  show: boolean;
  /** All messages in the chat (for history aggregation) */
  messages: Message[];
  /** Citations for a specific selected message (optional) */
  selectedCitations?: Citation[];
  /** Whether viewing a specific message's citations vs all history */
  isSelectedView?: boolean;
  backendLabel?: string;
}

export function CitationsPanel({
  show,
  messages,
  selectedCitations,
  isSelectedView = false,
  backendLabel,
}: CitationsPanelProps) {
  const [documentDetails, setDocumentDetails] = useState<
    Map<
      string,
      {
        id: string;
        filename: string;
        mime_type?: string;
        size_bytes?: number;
      }
    >
  >(new Map());

  // Aggregate all citations from chat history
  const historyDocuments = useMemo(
    () => aggregateCitations(messages),
    [messages],
  );

  // Documents to display: selected message's citations or full history
  const displayDocuments = useMemo(() => {
    if (isSelectedView && selectedCitations?.length) {
      // Group selected citations by document
      const docMap = new Map<
        string,
        { filename?: string; similarity: number; count: number }
      >();
      selectedCitations.forEach((c) => {
        const existing = docMap.get(c.documentId);
        if (existing) {
          existing.similarity += c.similarity || 0;
          existing.count++;
        } else {
          docMap.set(c.documentId, {
            filename: c.filename,
            similarity: c.similarity || 0,
            count: 1,
          });
        }
      });
      return Array.from(docMap.entries()).map(([documentId, data]) => ({
        documentId,
        filename: data.filename,
        referenceCount: data.count,
        avgSimilarity: data.count > 0 ? data.similarity / data.count : 0,
        messageCount: 1,
      }));
    }
    return historyDocuments;
  }, [isSelectedView, selectedCitations, historyDocuments]);

  // Fetch document details for displayed documents
  useEffect(() => {
    const fetchMissing = async () => {
      const toFetch = displayDocuments.filter(
        (d) => !documentDetails.has(d.documentId),
      );
      if (toFetch.length === 0) return;

      const newDetails = new Map<
        string,
        typeof documentDetails extends Map<string, infer V> ? V : never
      >();
      await Promise.all(
        toFetch.map(async (doc) => {
          try {
            const res = await fetch(`/api/docs/${doc.documentId}`);
            if (res.ok) {
              newDetails.set(doc.documentId, await res.json());
            }
          } catch {
            // Ignore fetch errors
          }
        }),
      );

      if (newDetails.size > 0) {
        setDocumentDetails((prev) => new Map([...prev, ...newDetails]));
      }
    };

    if (displayDocuments.length > 0) {
      fetchMissing();
    }
  }, [displayDocuments, documentDetails]);

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return null;
    return `${Math.round(similarity * 100)}%`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  if (!show) return null;

  const totalCitations = displayDocuments.reduce(
    (sum, d) => sum + d.referenceCount,
    0,
  );

  return (
    <div className="border-l border-border bg-card flex flex-col h-full min-h-0 w-full">
      {/* Header - more compact */}
      <div className="px-2.5 py-2 border-b border-border sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {isSelectedView ? "Message Sources" : "All Sources"}
          </h3>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {displayDocuments.length} doc
            {displayDocuments.length !== 1 ? "s" : ""}
            {totalCitations > 0 && ` · ${totalCitations} ref`}
          </span>
        </div>
        {backendLabel && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {backendLabel}
          </div>
        )}
      </div>

      {/* Content - tighter spacing */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {displayDocuments.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No sources yet</p>
            <p className="text-[10px] mt-1 text-muted-foreground/70">
              {messages.length === 0
                ? "Start chatting to see sources"
                : "No documents referenced"}
            </p>
          </div>
        ) : (
          displayDocuments.map((doc) => {
            const details = documentDetails.get(doc.documentId);
            const filename =
              details?.filename || doc.filename?.split("/").pop() || "Unknown";
            const similarity = formatSimilarity(doc.avgSimilarity);
            const size = formatFileSize(details?.size_bytes);

            return (
              <Card
                key={doc.documentId}
                className="px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <FileText className="size-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate leading-tight">
                      {filename}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                      <span>
                        {doc.referenceCount}×
                        {!isSelectedView &&
                          doc.messageCount > 1 &&
                          ` in ${doc.messageCount} msgs`}
                      </span>
                      {similarity && (
                        <>
                          <span className="text-border">·</span>
                          <span>{similarity}</span>
                        </>
                      )}
                      {size && (
                        <>
                          <span className="text-border">·</span>
                          <span>{size}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer - minimal */}
      {displayDocuments.length > 0 && (
        <div className="px-2.5 py-1.5 border-t border-border text-[10px] text-muted-foreground/70">
          {isSelectedView
            ? "Sources for selected message"
            : "All sources used in this chat"}
        </div>
      )}
    </div>
  );
}
