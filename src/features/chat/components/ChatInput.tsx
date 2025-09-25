"use client";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { RefObject } from "react";

export function ChatInput(props: {
  input: string;
  setInput: (v: string) => void;
  activeChatPresent: boolean;
  sending: boolean;
  uploadedFiles: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  triggerFileInput: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  onSubmit: () => void;
}) {
  const { input, setInput, activeChatPresent, sending, uploadedFiles, fileInputRef, triggerFileInput, handleFileSelect, removeFile, onSubmit } = props;
  return (
    <div className="border-t border-border p-4 bg-card sticky bottom-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      {uploadedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="text-sm text-muted-foreground">Uploaded files:</div>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <span className="text-primary">📄</span>
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-destructive ml-1" title="Remove file">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex gap-3">
        <div className="flex-1">
          <Input placeholder={activeChatPresent ? "Type your message..." : "Create or select a chat first"} value={input} onChange={(e) => setInput(e.target.value)} disabled={!activeChatPresent || sending} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !sending) { e.preventDefault(); onSubmit(); } }} className="h-12 text-base" />
        </div>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.md" className="hidden" />
        <Button type="button" variant="outline" disabled={!activeChatPresent || sending} onClick={triggerFileInput} className="h-12 px-4" title="Upload documents">📎</Button>
        <Button type="submit" disabled={!activeChatPresent || (!input.trim() && uploadedFiles.length === 0) || sending} className="h-12 px-6">
          {sending ? (<div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /><span>Sending</span></div>) : ("Send")}
        </Button>
      </form>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {input.length > 0 && <span>{input.length} characters</span>}
      </div>
    </div>
  );
}
