"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { cn } from "@/features/shared/lib/utils";
import { formatBytes } from "@/features/docs/lib/format-bytes";
import { getStatusStyle, sortDocuments } from "@/features/docs/lib/status";
import type { DocumentRow } from "@/features/docs/lib/types";
import { hasWorkingDocuments } from "@/features/docs/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock,
  FileText,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ReactNode } from "react";
import { Input } from "@/features/shared/components/ui/input";

const STATUS_ICONS: Record<string, ReactNode> = {
  pending: <Clock className="size-3.5" />,
  processing: <Loader2 className="size-3.5 animate-spin" />,
  ready: <CheckCircle2 className="size-3.5" />,
  error: <AlertTriangle className="size-3.5" />,
};

/**
 * Format progress as a percentage string or fraction.
 */
function formatProgress(
  progress: DocumentRow["progress"],
): string | null {
  if (!progress) return null;
  const { processed_chunks, total_chunks } = progress;
  if (total_chunks <= 0) return null;

  const percent = Math.round((processed_chunks / total_chunks) * 100);
  return `${percent}% (${processed_chunks}/${total_chunks})`;
}

type DocumentTableCardProps = {
  documents: DocumentRow[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  deletingDocumentId: string | null;
  renamingDocumentId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  beginRename: (document: DocumentRow) => void;
  submitRename: (documentId: string) => void;
  deleteDocument: (documentId: string) => void;
};

export function DocumentTableCard({
  documents,
  loading,
  onRefresh,
  //deletingDocumentId,
  renamingDocumentId,
  renameValue,
  setRenameValue,
  beginRename,
  submitRename,
  deleteDocument,
}: DocumentTableCardProps) {
  const sortedDocuments = sortDocuments(documents);
  const isPolling = hasWorkingDocuments(documents);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Document Library
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Monitor ingestion status and review uploaded files.
            {isPolling && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="size-3 animate-spin" />
                Auto-refreshing
              </span>
            )}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onRefresh()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[640px] table-auto text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {sortedDocuments.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CircleSlash className="size-5" />
                      <p>No documents yet. Start by uploading a file.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      {renamingDocumentId === doc.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitRename(doc.id);
                          }}
                          className="flex gap-2"
                        >
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => submitRename(doc.id)}
                            className="h-7 text-sm"
                            disabled={loading}
                          />
                        </form>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {doc.filename}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {doc.meta?.job_id ? `Job: ${doc.meta.job_id}` : ""}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.mime_type ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium w-fit",
                            getStatusStyle(doc.status),
                          )}
                        >
                          {STATUS_ICONS[doc.status ?? ""] ?? (
                            <Clock className="size-3.5" />
                          )}
                          <span className="capitalize">
                            {doc.status ?? "unknown"}
                          </span>
                        </span>
                        {/* Progress indicator for processing documents */}
                        {doc.status === "processing" && doc.progress && (
                          <span className="text-xs text-muted-foreground pl-1">
                            {formatProgress(doc.progress)}
                          </span>
                        )}
                        {/* Error reason tooltip for failed documents */}
                        {doc.status === "error" && doc.error_reason && (
                          <span
                            className="text-xs text-destructive/80 pl-1 flex items-center gap-1 cursor-help max-w-[200px] truncate"
                            title={doc.error_reason}
                          >
                            <Info className="size-3 flex-shrink-0" />
                            <span className="truncate">{doc.error_reason}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(doc.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginRename(doc);
                          }}
                          title="Rename document"
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Are you sure you want to delete the document "${doc.filename}"?`,
                              )
                            )
                              deleteDocument(doc.id);
                          }}
                          title="Delete document"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="size-5 animate-spin" />
                      <p>Loading documents...</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
