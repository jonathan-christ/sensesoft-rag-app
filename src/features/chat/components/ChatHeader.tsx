"use client";
import { Button } from "@/features/shared/components/ui/button";

export function ChatHeader(props: {
  title: string;
  sending: boolean;
  messagesCount: number;
  onSaveAsNew: () => void;
  showCitations: boolean;
  toggleCitations: () => void;
}) {
  const {
    title,
    sending,
    messagesCount,
    onSaveAsNew,
    showCitations,
    toggleCitations,
  } = props;
  return (
    <div className="border-b border-border p-4 bg-card sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-lg">{title}</h1>
          {sending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">AI is typing...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messagesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveAsNew}
              className="h-8 px-3"
            >
              Save as New
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCitations}
            className="h-8 px-3"
          >
            {showCitations ? "Hide Sources" : "Show Sources"}
          </Button>
        </div>
      </div>
    </div>
  );
}
