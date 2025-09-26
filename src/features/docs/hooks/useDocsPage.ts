import { useCallback, useEffect, useState } from "react";

import type { DocumentRow } from "../lib/types";
import { fetchDocuments, uploadDocuments } from "../lib/api";

interface UseDocsPageOptions {
  limit?: number;
}

export function useDocsPage({ limit = 50 }: UseDocsPageOptions = {}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await fetchDocuments(limit);
      setDocuments(json.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const upload = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      await uploadDocuments(files);
      setFiles([]);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [files, loadDocuments]);

  return {
    state: {
      documents,
      loading,
      uploading,
      error,
      files,
    },
    actions: {
      addFiles,
      removeFile,
      upload,
      refresh: loadDocuments,
      setError,
    },
  };
}
