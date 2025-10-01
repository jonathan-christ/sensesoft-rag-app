"use client";
import { useState, useEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Card } from "@/features/shared/components/ui/card";
import { FileText, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

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

interface DocumentCitations {
  documentId: string;
  filename?: string;
  chunks: Array<{
    chunkId: number;
    similarity?: number;
    content?: string;
  }>;
}

export function CitationsPanel({ show, messagesLength, backendLabel, citations = [] }: CitationsPanelProps) {
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
  const [documentDetails, setDocumentDetails] = useState<Map<string, {
    id: string;
    filename: string;
    chunk_count?: number;
    mime_type?: string;
    size_bytes?: number;
    status?: string;
    created_at?: string;
  }>>(new Map());

  // Group citations by document
  const groupedCitations: DocumentCitations[] = citations.reduce((acc, citation) => {
    const existing = acc.find(doc => doc.documentId === citation.documentId);
    if (existing) {
      existing.chunks.push({
        chunkId: citation.chunkId,
        similarity: citation.similarity,
        content: citation.content
      });
    } else {
      acc.push({
        documentId: citation.documentId,
        filename: citation.filename,
        chunks: [{
          chunkId: citation.chunkId,
          similarity: citation.similarity,
          content: citation.content
        }]
      });
    }
    return acc;
  }, [] as DocumentCitations[]);

  // Fetch document details when citations change
  useEffect(() => {
    const fetchDocumentDetails = async () => {
      const newDetails = new Map();
      
      for (const group of groupedCitations) {
        if (!documentDetails.has(group.documentId)) {
          try {
            const response = await fetch(`/api/docs/${group.documentId}`);
            if (response.ok) {
              const docData = await response.json();
              newDetails.set(group.documentId, docData);
            }
          } catch (error) {
            console.error('Failed to fetch document details:', error);
          }
        }
      }
      
      if (newDetails.size > 0) {
        setDocumentDetails(prev => new Map([...prev, ...newDetails]));
      }
    };

    if (groupedCitations.length > 0) {
      fetchDocumentDetails();
    }
  }, [citations, groupedCitations, documentDetails]);

  const toggleDocument = (documentId: string) => {
    setExpandedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return '';
    return `${Math.round(similarity * 100)}%`;
  };

  const truncateContent = (content?: string, maxLength = 200) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  if (!show) {
    return null;
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-border sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sources</h3>
          <div className="text-sm text-muted-foreground">
            {citations.length} citation{citations.length !== 1 ? 's' : ''}
          </div>
        </div>
        {backendLabel && (
          <div className="text-xs text-muted-foreground mt-1">
            Powered by {backendLabel}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No sources available</p>
            <p className="text-xs mt-2">
              {messagesLength === 0 
                ? "Start a conversation to see relevant sources" 
                : "The AI didn't reference any documents for this response"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedCitations.map((docGroup) => {
              const docDetails = documentDetails.get(docGroup.documentId);
              const isExpanded = expandedDocuments.has(docGroup.documentId);
              
              return (
                <Card key={docGroup.documentId} className="p-3">
                  <div className="space-y-2">
                    {/* Document Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleDocument(docGroup.documentId)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {docDetails?.filename || docGroup.filename || 'Unknown Document'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {docGroup.chunks.length} reference{docGroup.chunks.length !== 1 ? 's' : ''}
                            {docDetails?.chunk_count && ` • ${docDetails.chunk_count} total chunks`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {docDetails && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            title="View document details"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-2 pl-6">
                        {docGroup.chunks.map((chunk) => (
                          <div key={chunk.chunkId} className="bg-muted/50 rounded p-2 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-mono text-primary">
                                Chunk #{chunk.chunkId}
                              </span>
                              {chunk.similarity && (
                                <span className="text-muted-foreground">
                                  {formatSimilarity(chunk.similarity)} match
                                </span>
                              )}
                            </div>
                            {chunk.content && (
                              <div className="text-muted-foreground leading-relaxed">
                                {truncateContent(chunk.content)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {citations.length > 0 && (
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          Citations are ranked by relevance to your query
        </div>
      )}
    </div>
  );
}
