"use client";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import {
  TooltipProvider,
} from "@/features/shared/components/ui/tooltip";
import type { Citation } from "@/features/chat/components/CitationsPanel";
import { MarkdownMessage } from "@/features/chat/components/MarkdownMessage";
import type { Message } from "@/lib/types";
import { RefObject, memo, useMemo } from "react";

type MessagesPanelProps = {
  messages: Message[];
  retryMessage: (id: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  citations?: Citation[];
  onCitationActivate?: (index: number) => void;
};

function MessagesPanelBase(props: MessagesPanelProps) {
  const { messages, retryMessage, bottomRef, citations, onCitationActivate } =
    props;

  const latestAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        return messages[i]?.id;
      }
    }
    return undefined;
  }, [messages]);

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0} disableHoverableContent>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
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
            const showCitations =
              !isUser && latestAssistantId && msg.id === latestAssistantId;
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : msg._error ? "bg-destructive/10 border-destructive/30" : "bg-muted"}`}
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
                          onClick={() => retryMessage(msg.id)}
                          className="h-7 px-3 text-xs"
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <MarkdownMessage
                        content={msg.content}
                        citations={showCitations ? citations : undefined}
                        onCitationActivate={onCitationActivate}
                      />
                    )}
                    {msg._streaming && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 align-bottom">
                        |
                      </span>
                    )}
                    {msg._limitNotice && (
                      <div className="mt-2 text-xs text-amber-600">
                        ⚠️ {msg._limitNotice}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-2">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </TooltipProvider>
  );
}

const MemoMessagesPanel = memo(MessagesPanelBase);

export function MessagesPanel(props: MessagesPanelProps) {
  return <MemoMessagesPanel {...props} />;
}

MessagesPanel.displayName = "MessagesPanel";
