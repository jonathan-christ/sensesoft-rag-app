"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import { streamChat } from "../actions/stream-chat";
import { NextRequest } from "next/server";

interface ChatRow {
  id: string;
  title: string;
  created_at: string;
}

interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  _streaming?: boolean;
  _error?: string;
}

export function ChatApp() {
  const [chats, setChats] = useState<ChatRow[]>([
    { id: "1", title: "Welcome Chat", created_at: new Date().toISOString() },
  ]);
  const [activeChatId, setActiveChatId] = useState<string>("1");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createChat = useCallback(() => {
    const newId = Date.now().toString();
    const newChat: ChatRow = {
      id: newId,
      title: `Chat ${chats.length + 1}`,
      created_at: new Date().toISOString(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setMessages([]);
    setGlobalError(null);
  }, [chats.length]);

  const beginRename = useCallback((chat: ChatRow) => {
    setRenamingChatId(chat.id);
    setRenameValue(chat.title);
  }, []);

  const submitRename = useCallback(
    (chatId: string) => {
      if (!renameValue.trim()) {
        setRenamingChatId(null);
        return;
      }
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, title: renameValue.trim() } : c
        )
      );
      setRenamingChatId(null);
    },
    [renameValue]
  );

  const switchChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    // Simulate loading messages for different chats
    if (chatId === "1") {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setMessages([]); // Empty for new chats
    }
    setGlobalError(null);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId || sending) return;

    setGlobalError(null);
    setSending(true);

    // Add user message immediately
    const userMsg: Msg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    // Add assistant placeholder for streaming
    const assistantMsg: Msg = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      _streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const currentInput = input;
    setInput("");

    try {
      // REAL STREAMING - Replace simulation with actual API call
      await realStreamingResponse(assistantMsg.id, currentInput);
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                _streaming: false,
                _error: "Failed to get response. Please try again.",
              }
            : m
        )
      );
      setGlobalError("Connection error. Please check your internet connection.");
    } finally {
      setSending(false);
    }
  };

  // REPLACE realStreamingResponse with this:
  const realStreamingResponse = async (messageId: string, userInput: string) => {
    const conversationHistory = messages.concat({
      id: `user-${Date.now()}`,
      role: "user",
      content: userInput,
      created_at: new Date().toISOString(),
    });

    try {
      const response = await streamChat({
        messages: conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model: "gemini-2.5-flash",
      });

      let assistantContent = "";

      for await (const chunk of response.stream) {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: assistantContent } : m
          )
        );
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, _streaming: false } : m
        )
      );
    } catch (error) {
      throw error; // Re-throw to be handled by the calling function
    }
  };

  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?._error) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, _error: undefined, _streaming: true, content: "" }
          : m
      )
    );

    simulateStreamingResponse(messageId, "retry request").catch(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, _streaming: false, _error: "Retry failed" }
            : m
        )
      );
    });
  }, [messages]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chats</h2>
            <Button
              size="sm"
              onClick={createChat}
              disabled={sending}
              className="h-8 px-3"
            >
              + New
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group relative mb-1 rounded-lg p-3 cursor-pointer transition-colors ${
                chat.id === activeChatId
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted border border-transparent"
              }`}
              onClick={() => !sending && switchChat(chat.id)}
            >
              {renamingChatId === chat.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRename(chat.id);
                  }}
                  className="flex gap-2"
                >
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setRenamingChatId(null);
                      }
                    }}
                    className="h-7 text-sm"
                  />
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      beginRename(chat);
                    }}
                  >
                    ✎
                  </Button>
                </div>
              )}
            </div>
          ))}

          {chats.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4">
              No chats yet. Create your first chat!
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-border p-4 bg-card">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-lg">
              {activeChat ? activeChat.title : "Select a chat"}
            </h1>
            {sending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">AI is typing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <div className="text-lg mb-2">Welcome to AI Chat</div>
                <div className="text-sm">
                  Create a new chat or select an existing one to begin
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <div className="text-lg mb-2">Start a conversation</div>
                <div className="text-sm">
                  Type your message below to begin chatting
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <Card
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg._error
                      ? "bg-destructive/10 border-destructive/30"
                      : "bg-muted"
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
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                        {msg._streaming && (
                          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">
                            |
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-xs opacity-70 mt-2">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <span>⚠️</span>
              <span>{globalError}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGlobalError(null)}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-3"
          >
            <div className="flex-1">
              <Input
                placeholder={
                  activeChat
                    ? "Type your message..."
                    : "Create or select a chat first"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!activeChat || sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !sending) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={!activeChat || !input.trim() || sending}
              className="h-12 px-6"
            >
              {sending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Sending</span>
                </div>
              ) : (
                "Send"
              )}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {input.length > 0 && <span>{input.length} characters</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChat({
          messages,
          model: "gemini-2.5-flash",
          onToken: (delta: string) => {
            controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
          },
          onFinal: () => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}