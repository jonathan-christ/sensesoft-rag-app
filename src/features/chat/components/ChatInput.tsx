"use client";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Send, Loader2 } from "lucide-react";

export function ChatInput(props: {
  input: string;
  setInput: (v: string) => void;
  activeChatPresent: boolean;
  sending: boolean;
  onSubmit: () => void;
}) {
  const { input, setInput, activeChatPresent, sending, onSubmit } = props;
  return (
    <div className="border-t border-border p-4 sticky bottom-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-3"
      >
        <div className="flex-1">
          <Input
            placeholder={
              activeChatPresent
                ? "Type your message..."
                : "Create or select a chat first"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeChatPresent || sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !sending) {
                e.preventDefault();
                onSubmit();
              }
            }}
            className="h-12 text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={!activeChatPresent || !input.trim() || sending}
          className="h-12 aspect-square"
        >
          {sending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {input.length > 0 && <span>{input.length} characters</span>}
      </div>
    </div>
  );
}
