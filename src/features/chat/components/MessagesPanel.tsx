"use client";
import type { RefObject } from "react";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import type { Message } from "@/lib/types";
import { MarkdownMessage } from "@/features/chat/components/MarkdownMessage";
import { TypingIndicator } from "@/features/chat/components/TypingIndicator";

export function MessagesPanel(props: {
  messages: Message[];
  retryMessage: (id: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  const { messages, retryMessage, bottomRef } = props;

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

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] py-0 ${
                  isUser
                    ? "bg-primary text-primary-foreground border-border/20"
                    : msg._error
                      ? "bg-destructive/10 border-destructive/30 shadow-none"
                      : "bg-muted shadow-none"
                }`}
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
                    <div className="space-y-2">
                      {/* Show audio player for messages with audio_url */}
                      {msg.audio_url && msg.role === "user" && (
                        <div className="mb-2">
                          <audio
                            controls
                            className="w-full max-w-xs h-8"
                            style={{ minHeight: "32px" }}
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
  );
}
