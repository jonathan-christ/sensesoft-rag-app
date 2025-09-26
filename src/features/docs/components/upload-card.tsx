"use client";

import { useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { AlertTriangle, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/features/docs/lib/format-bytes";

type UploadCardProps = {
  files: File[];
  uploading: boolean;
  error: string | null;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onUpload: () => Promise<void> | void;
};

export function UploadCard({
  files,
  uploading,
  error,
  onAddFiles,
  onRemoveFile,
  onUpload,
}: UploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    const mapped = Array.from(selectedFiles);
    if (mapped.length > 0) {
      onAddFiles(mapped);
    }
    event.target.value = "";
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="size-5" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Add files to your knowledge base. Supported formats include PDF,
          Markdown, and plain text.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.md,.txt,.markdown,.doc,.docx"
            onChange={handleFileChange}
          />
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Pending upload
              </div>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="size-4 text-primary" />
                      <span className="truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => onRemoveFile(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Start upload
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={triggerPicker}>
            Add more files
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            <span className="truncate" title={error}>
              {error}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
