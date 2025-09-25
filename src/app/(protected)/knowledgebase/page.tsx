"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentTableCard } from "@/features/knowledgebase/components/document-table-card";
import { UploadCard } from "@/features/knowledgebase/components/upload-card";
import type { DocumentRow } from "@/features/knowledgebase/lib/types";

export default function KnowledgebasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/docs?limit=50", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load documents (${response.status})`);
      }
      const json = await response.json();
      setDocuments(json.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleAddFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to upload documents");
      }

      setFiles([]);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [files, loadDocuments]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <UploadCard
            files={files}
            uploading={uploading}
            error={error}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleRemoveFile}
            onUpload={handleUpload}
          />
          <DocumentTableCard
            documents={documents}
            loading={loading}
            onRefresh={loadDocuments}
          />
        </div>
      </div>
    </div>
  );
}
