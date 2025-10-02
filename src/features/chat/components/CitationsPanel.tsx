"use client";
import { useState, useEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Card } from "@/features/shared/components/ui/card";
import {
  FileText,
} from "lucide-react";

export interface Citation {
  chunkId: number;
  documentId: string;
  filename?: string;
  similarity?: number;
  content?: string;
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
          avgSimilarity: citations
            .filter((c) => c.documentId === citation.documentId)
            .reduce((sum, c) => sum + (c.similarity || 0), 0) /
            citations.filter((c) => c.documentId === citation.documentId).length,
          referenceCount: citations.filter(
            (c) => c.documentId === citation.documentId,
          ).length,
        },
      ])
    ).values()
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
  }, [citations, uniqueDocuments]);

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
                        Used {doc.referenceCount} time{doc.referenceCount !== 1 ? "s" : ""} in response
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
                              {docDetails.mime_type.split('/')[1]} file
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
