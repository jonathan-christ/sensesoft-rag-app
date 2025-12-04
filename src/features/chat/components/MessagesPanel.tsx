"use client";
import type { RefObject } from "react";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import type { Citation, Message } from "@/lib/types";
import { MarkdownMessage } from "@/features/chat/components/MarkdownMessage";
import { TypingIndicator } from "@/features/chat/components/TypingIndicator";
import LoadingSpinner from "@/features/shared/components/loading-spinner";
import { FileText } from "lucide-react";
import { cn } from "@/features/shared/lib/utils";

interface MessagesPanelProps {
  messages: Message[];
  retryMessage: (id: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  /** Currently selected message ID for citation focus (optional) */
  selectedMessageId?: string | null;
  /** Callback when user clicks an assistant message to view its citations */
  onMessageSelect?: (messageId: string, citations: Citation[]) => void;
}

export function MessagesPanel(props: MessagesPanelProps) {
  const {
    messages,
    retryMessage,
    bottomRef,
    loading,
    selectedMessageId,
    onMessageSelect,
  } = props;

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <LoadingSpinner label="messages" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-2">Start a conversation</div>
            <div className="text-sm">
              Type your message below to begin chatting
            </div>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === "user";
          const isAssistant = msg.role === "assistant";
          const hasCitations =
            isAssistant && msg.citations && msg.citations.length > 0;
          const isSelected = selectedMessageId === msg.id;

          // Make assistant messages with citations clickable
          const handleClick = () => {
            if (hasCitations && onMessageSelect && msg.citations) {
              onMessageSelect(msg.id, msg.citations);
            }
          };

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={cn(
                  "max-w-[80%] py-0 transition-all duration-200",
                  isUser
                    ? "bg-primary text-primary-foreground border-border/20"
                    : msg._error
                      ? "bg-destructive/10 border-destructive/30 shadow-none"
                      : "bg-muted shadow-none",
                  // Highlight selected message
                  isSelected &&
                    "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
                  // Cursor pointer for clickable messages
                  hasCitations && onMessageSelect && "cursor-pointer",
                )}
                onClick={handleClick}
              >
                <CardContent className="p-4">
                  {msg._error ? (
                    <div className="space-y-2">
                      <div className="text-destructive text-sm font-medium">
                        ⚠️ {msg._error}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryMessage(msg.id);
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Show audio player for messages with audio_url */}
                      {msg.audio_url && msg.role === "user" && (
                        <div className="mb-2">
                          <audio
                            controls
                            className="w-full max-w-xs h-8"
                            style={{ minHeight: "32px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <source src={msg.audio_url} type="audio/webm" />
                            <source src={msg.audio_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {/* Show message content */}
                      <div className="text-sm whitespace-pre-wrap">
                        {isUser ? (
                          msg.content
                        ) : (
                          <MarkdownMessage
                            content={msg.content}
                            citations={msg.citations}
                          />
                        )}
                        {msg._streaming && (
                          <TypingIndicator
                            className="mt-3"
                            dotClassName="bg-current/80 h-1.5 w-1.5"
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {msg._limitNotice && (
                    <div className="mt-2 text-xs text-amber-600">
                      ⚠️ {msg._limitNotice}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                    {/* Citations indicator for assistant messages */}
                    {hasCitations && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs transition-colors",
                          isSelected
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={`${msg.citations?.length} source${msg.citations?.length !== 1 ? "s" : ""} - click to view`}
                      >
                        <FileText className="size-3" />
                        <span>{msg.citations?.length}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
