"use client";

/**
 * BACKEND INTEGRATION GUIDE
 * ========================
 * 
 * This chat component now uses the /api/chat/stream API route for backend integration.
 * 
 * TO ENABLE REAL BACKEND:
 * 1. Set USE_REAL_BACKEND = true (line ~27)
 * 2. Ensure your streamChat function in @/features/chat/actions/stream-chat works correctly
 * 3. The API route at /app/api/chat/stream/route.ts handles the server-side streaming
 * 4. Your GOOGLE_GENAI_API_KEY is now safely accessed server-side only
 * 
 * CURRENT STATE: Using simulation for development (USE_REAL_BACKEND = false)
 * 
 * ARCHITECTURE:
 * Client (chat page) → API Route (/api/chat/stream) → streamChat function → Gemini API
 * 
 * The integration is ready - just flip the switch when your backend is complete!
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import type { Message } from "@/features/shared/lib/types";

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

// TODO: Backend developers - replace this with your actual implementation
const USE_REAL_BACKEND = false; // 🔄 TOGGLE THIS TO TRUE WHEN BACKEND IS READY

/**
 * Backend Integration Configuration
 * =================================
 * 
 * When USE_REAL_BACKEND is true, the component will:
 * - Convert UI messages to Message[] format expected by streamChat
 * - Call streamChat() with proper parameters (messages, temperature, max_tokens)
 * - Stream the response in real-time
 * - Handle errors appropriately
 * 
 * When USE_REAL_BACKEND is false:
 * - Uses simulation for frontend development
 * - Maintains the same streaming UX
 */

/**
 * Simulates streaming response for development purposes
 * Backend developers: Remove this function when real implementation is ready
 */
const simulateStreamingResponse = async (messageId: string, userInput: string) => {
  const responses = [
    "I understand your question about ",
    "That's an interesting point. Let me think about ",
    "Based on what you've mentioned regarding ",
    "I can help you with ",
  ];
  
  const baseResponse = responses[Math.floor(Math.random() * responses.length)] + userInput.toLowerCase();
  const fullResponse = baseResponse + ". Here's what I think would be most helpful for your situation.";
  
  const words = fullResponse.split(" ");
  let currentText = "";

  async function* streamGenerator() {
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100));
      currentText += (i > 0 ? " " : "") + words[i];
      yield currentText;
    }
  }

  return {
    stream: streamGenerator(),
    model: "simulated-model"
  };
};

/**
 * Parses Server-Sent Events stream from the API
 */
async function* parseSSEStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.done) {
              return;
            }
            if (data.content) {
              yield data.content;
            }
          } catch (e) {
            console.warn("Failed to parse SSE data:", line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function ChatApp() {
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
      await handleStreamingResponse(assistantMsg.id, currentInput);
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

  /**
   * Handles streaming response from the backend
   * Backend developers: This function integrates with your streamChat implementation
   * 
   * TESTING YOUR BACKEND:
   * 1. Set USE_REAL_BACKEND = true
   * 2. Send a message in the chat
   * 3. Verify that streamChat receives the correct Message[] array
   * 4. Ensure the response streams properly (word by word)
   * 5. Check error handling works if streamChat fails
   */
  const handleStreamingResponse = async (messageId: string, userInput: string) => {
    try {
      let response;

      if (USE_REAL_BACKEND) {
        // Convert current messages to the format expected by streamChat
        const chatMessages: Message[] = messages
          .filter(msg => !msg._streaming && !msg._error)
          .map(msg => ({
            id: msg.id,
            chat_id: activeChatId,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          }));

        // Add the current user message
        chatMessages.push({
          id: `user-${Date.now()}`,
          chat_id: activeChatId,
          role: "user",
          content: userInput,
          created_at: new Date().toISOString(),
        });

        // Call the real backend via API route
        console.log("🔄 Calling /api/chat/stream with:", { 
          messageCount: chatMessages.length, 
          lastMessage: chatMessages[chatMessages.length - 1]?.content 
        });
        
        // Call the streaming API
        const apiResponse = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`API call failed: ${apiResponse.status}`);
        }

        // Create a response object that matches the expected interface
        response = {
          stream: parseSSEStream(apiResponse),
          model: "gemini-2.5-flash"
        };
      } else {
        // Use simulation for development
        response = await simulateStreamingResponse(messageId, userInput);
      }

      // Stream the response
      for await (const chunk of response.stream) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: chunk } : m
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
    const message = messages.find(m => m.id === messageId);
    if (!message?._error) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, _error: undefined, _streaming: true, content: "" }
          : m
      )
    );

    handleStreamingResponse(messageId, "retry request").catch(() => {
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
                <div className="text-sm">Create a new chat or select an existing one to begin</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <div className="text-lg mb-2">Start a conversation</div>
                <div className="text-sm">Type your message below to begin chatting</div>
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
            {input.length > 0 && (
              <span>{input.length} characters</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ChatApp };

export default function ChatPage() {
  return <ChatApp />;
}