"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/features/shared/components/ui/card";
import { FileText } from "lucide-react";
import type { Citation } from "@/lib/types";

// Utility component for hoverable document references
export function DocumentReferenceTooltip({
  reference,
  documentName,
  className = "",
}: {
  reference: string;
  documentName: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono cursor-help border border-blue-200 hover:bg-blue-200 transition-colors ${className}`}
      title={documentName}
    >
      {reference}
    </span>
  );
}

// Utility function to parse text and make document references hoverable
export function parseDocumentReferences(
  text: string,
  citations: Citation[],
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    return [text];
  }

  // Create reference mapping that matches the prompt building logic (group by document)
  const referenceMap = new Map<
    string,
    { documentName: string; documentId: string }
  >();
  const documentGroups = new Map<
    string,
    { filename?: string; referenceNumber: number }
  >();

  // First pass: group citations by document ID and assign reference numbers
  citations.forEach((citation) => {
    if (!documentGroups.has(citation.documentId)) {
      const referenceNumber = documentGroups.size + 1;
      documentGroups.set(citation.documentId, {
        filename: citation.filename,
        referenceNumber,
      });
    }
  });

  // Second pass: create reference mapping
  documentGroups.forEach((group, documentId) => {
    if (group.filename) {
      const extension =
        group.filename.split(".").pop()?.toUpperCase() || "FILE";
      const filename = group.filename.split("/").pop() || group.filename;
      referenceMap.set(`[${extension}${group.referenceNumber}]`, {
        documentName: filename,
        documentId: documentId,
      });
    }

    // Also handle fallback references with document ID
    const shortId = documentId.substring(0, 8);
    referenceMap.set(`[Doc-${shortId}]`, {
      documentName: group.filename || "Unknown Document",
      documentId: documentId,
    });
  });

  // Pattern to match document references like [PDF1], [DOCX2], [Doc-abc12345]
  const referencePattern = /(\[[^\]]+\])/g;
  const parts = text.split(referencePattern);

  return parts.map((part, index) => {
    const referenceInfo = referenceMap.get(part);
    if (referenceInfo) {
      return (
        <DocumentReferenceTooltip
          key={`${referenceInfo.documentId}-${index}`}
          reference={part}
          documentName={referenceInfo.documentName}
        />
      );
    }
    return part;
  });
}

interface CitationsPanelProps {
  show: boolean;
  messagesLength: number;
  backendLabel: string;
  citations?: Citation[];
}

export function CitationsPanel({
  show,
  messagesLength,
  backendLabel,
  citations = [],
}: CitationsPanelProps) {
  const [documentDetails, setDocumentDetails] = useState<
    Map<
      string,
      {
        id: string;
        filename: string;
        chunk_count?: number;
        mime_type?: string;
        size_bytes?: number;
        status?: string;
        created_at?: string;
      }
    >
  >(new Map());

  // Group citations by document (simplified - just show unique documents)
  const uniqueDocuments = Array.from(
    new Map(
      citations.map((citation) => [
        citation.documentId,
        {
          documentId: citation.documentId,
          filename: citation.filename,
          // Calculate average similarity for the document
          avgSimilarity:
            citations
              .filter((c) => c.documentId === citation.documentId)
              .reduce((sum, c) => sum + (c.similarity || 0), 0) /
            citations.filter((c) => c.documentId === citation.documentId)
              .length,
          referenceCount: citations.filter(
            (c) => c.documentId === citation.documentId,
          ).length,
        },
      ]),
    ).values(),
  );

  // Fetch document details when citations change
  useEffect(() => {
    const fetchDocumentDetails = async () => {
      const newDetails = new Map();

      for (const doc of uniqueDocuments) {
        if (!documentDetails.has(doc.documentId)) {
          try {
            const response = await fetch(`/api/docs/${doc.documentId}`);
            if (response.ok) {
              const docData = await response.json();
              newDetails.set(doc.documentId, docData);
            }
          } catch (error) {
            console.error("Failed to fetch document details:", error);
          }
        }
      }

      if (newDetails.size > 0) {
        setDocumentDetails((prev) => new Map([...prev, ...newDetails]));
      }
    };

    if (uniqueDocuments.length > 0) {
      fetchDocumentDetails();
    }
  }, [citations, uniqueDocuments, documentDetails]);

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return "";
    return `${Math.round(similarity * 100)}%`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  // Function to create document reference mapping for hover functionality
  // const createReferenceMapping = (): Map<string, HoverableReference> => {
  //   const mapping = new Map<string, HoverableReference>();

  //   uniqueDocuments.forEach((doc) => {
  //     const docDetails = documentDetails.get(doc.documentId);
  //     const filename = docDetails?.filename || doc.filename;

  //     if (filename) {
  //       // Extract file extension for reference
  //       const extension = filename.split(".").pop()?.toUpperCase() || "FILE";
  //       const name = filename.split("/").pop() || filename;

  //       // Create different possible reference formats that might appear in text
  //       const shortName = name.split(".")[0];
  //       const truncatedName =
  //         shortName.length > 15
  //           ? shortName.substring(0, 15) + "..."
  //           : shortName;

  //       // Map various possible reference formats to document info
  //       mapping.set(`[${extension}]`, {
  //         reference: `[${extension}]`,
  //         documentName: name,
  //         documentId: doc.documentId,
  //       });

  //       mapping.set(`[${truncatedName}]`, {
  //         reference: `[${truncatedName}]`,
  //         documentName: name,
  //         documentId: doc.documentId,
  //       });
  //     }

  //     // Fallback mapping for document ID based references
  //     const shortId = doc.documentId.substring(0, 8);
  //     mapping.set(`[Doc-${shortId}]`, {
  //       reference: `[Doc-${shortId}]`,
  //       documentName:
  //         docDetails?.filename || doc.filename || "Unknown Document",
  //       documentId: doc.documentId,
  //     });
  //   });

  //   return mapping;
  // };

  if (!show) {
    return null;
  }

  return (
    <div className="border-l border-border bg-card flex flex-col h-full min-h-0 w-full">
      <div className="p-3 border-b border-border sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold flex-shrink-0">Sources</h3>
          <div className="text-xs text-muted-foreground text-right">
            {citations.length} citation{citations.length !== 1 ? "s" : ""}
          </div>
        </div>
        {backendLabel && (
          <div className="text-xs text-muted-foreground mt-1 break-words">
            Powered by {backendLabel}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {citations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No sources available</p>
            <p className="text-xs mt-2">
              {messagesLength === 0
                ? "Start a conversation to see relevant sources"
                : "The AI didn't reference any documents for this response"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueDocuments.map((doc) => {
              const docDetails = documentDetails.get(doc.documentId);

              return (
                <Card key={doc.documentId} className="p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium break-words leading-tight">
                        {docDetails?.filename ||
                          doc.filename ||
                          "Unknown Document"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 break-words">
                        Used {doc.referenceCount} time
                        {doc.referenceCount !== 1 ? "s" : ""} in response
                        {doc.avgSimilarity > 0 && (
                          <span className="block sm:inline">
                            {" • "}
                            {formatSimilarity(doc.avgSimilarity)} relevance
                          </span>
                        )}
                      </div>
                      {docDetails && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {docDetails.mime_type && (
                            <span className="capitalize">
                              {docDetails.mime_type.split("/")[1]} file
                            </span>
                          )}
                          {docDetails.size_bytes && (
                            <span>
                              {" • "}
                              {formatFileSize(docDetails.size_bytes)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {citations.length > 0 && (
        <div className="p-3 border-t border-border text-xs text-muted-foreground break-words">
          Citations are ranked by relevance to your query
        </div>
      )}
    </div>
  );
}
