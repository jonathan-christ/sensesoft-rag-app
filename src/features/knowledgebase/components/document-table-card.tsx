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
import { formatBytes } from "@/features/knowledgebase/lib/format-bytes";
import {
  getStatusStyle,
  sortDocuments,
} from "@/features/knowledgebase/lib/status";
import type { DocumentRow } from "@/features/knowledgebase/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

const STATUS_ICONS: Record<string, JSX.Element> = {
  pending: <Clock className="size-3.5" />,
  processing: <Loader2 className="size-3.5 animate-spin" />,
  ready: <CheckCircle2 className="size-3.5" />,
  error: <AlertTriangle className="size-3.5" />,
};

type DocumentTableCardProps = {
  documents: DocumentRow[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
};

export function DocumentTableCard({
  documents,
  loading,
  onRefresh,
}: DocumentTableCardProps) {
  const sortedDocuments = sortDocuments(documents);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Document Library
          </CardTitle>
          <CardDescription>
            Monitor ingestion status and review uploaded files.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
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
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {doc.filename}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doc.meta?.job_id ? `Job: ${doc.meta.job_id}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.mime_type ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
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
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(doc.created_at).toLocaleString()}
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
