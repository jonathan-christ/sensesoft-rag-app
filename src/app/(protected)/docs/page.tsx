"use client";

import { DocumentTableCard } from "@/features/docs/components/document-table-card";
import { UploadCard } from "@/features/docs/components/upload-card";
import { useDocsPage } from "@/features/docs/hooks/useDocsPage";

export default function DocsPage() {
  const {
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
      refresh,
      beginRename,
      setRenameValue,
      submitRename,
      deleteDocument,
    },
  } = useDocsPage();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <UploadCard
            files={files}
            uploading={uploading}
            error={error}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onUpload={upload}
          />
          <DocumentTableCard
            documents={documents}
            loading={loading}
            onRefresh={refresh}
            deletingDocumentId={deletingDocumentId}
            renamingDocumentId={renamingDocumentId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            beginRename={beginRename}
            submitRename={submitRename}
            deleteDocument={deleteDocument}
          />
        </div>
      </div>
    </div>
  );
}
