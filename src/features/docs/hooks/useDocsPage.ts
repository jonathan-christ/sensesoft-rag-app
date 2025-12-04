import { useCallback, useEffect, useRef, useState } from "react";

import { type DocumentRow, hasWorkingDocuments } from "../lib/types";
import {
  deleteDocument,
  fetchDocuments,
  updateDocument,
  uploadDocuments,
} from "../lib/api";

/** Polling interval when documents are being processed (in ms) */
const POLLING_INTERVAL = 4000;

interface UseDocsPageOptions {
  limit?: number;
}

export function useDocsPage({ limit = 50 }: UseDocsPageOptions = {}) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState<string>("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const loadDocuments = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const json = await fetchDocuments(limit);
        if (mountedRef.current) {
          setDocuments(json.documents ?? []);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load documents",
          );
        }
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [limit],
  );

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    void loadDocuments();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDocuments]);

  // Polling when documents are processing
  useEffect(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Start polling if any documents are in a working state
    if (hasWorkingDocuments(documents)) {
      pollingRef.current = setInterval(() => {
        void loadDocuments(true); // Silent refresh (no loading indicator)
      }, POLLING_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [documents, loadDocuments]);

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

  const beginRename = useCallback((document: DocumentRow) => {
    setRenamingDocumentId(document.id);
    setRenameValue(document.filename);
  }, []);

  const submitRename = useCallback(
    async (documentId: string) => {
      if (!renameValue.trim()) {
        setError("Filename cannot be empty.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await updateDocument(documentId, renameValue.trim());
        setRenamingDocumentId(null);
        setRenameValue("");
        await loadDocuments();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to rename document",
        );
      } finally {
        setLoading(false);
      }
    },
    [renameValue, loadDocuments],
  );

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      setDeletingDocumentId(documentId);
      setLoading(true);
      setError(null);
      try {
        await deleteDocument(documentId);
        await loadDocuments();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete document",
        );
      } finally {
        setLoading(false);
        setDeletingDocumentId(null);
      }
    },
    [loadDocuments],
  );

  return {
    state: {
      documents,
      loading,
      uploading,
      error,
      files,
      deletingDocumentId,
      renamingDocumentId,
      renameValue,
    },
    actions: {
      addFiles,
      removeFile,
      upload,
      refresh: loadDocuments,
      setError,
      beginRename,
      setRenameValue,
      submitRename,
      deleteDocument: handleDeleteDocument,
    },
  };
}
