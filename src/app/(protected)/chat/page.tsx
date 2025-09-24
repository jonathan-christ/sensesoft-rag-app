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
import type { Message, ChatRow } from "@/lib/types";

// Backend is ready - enabling real backend integration
const USE_REAL_BACKEND = true;

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
const simulateStreamingResponse = async (
  messageId: string,
  userInput: string,
) => {
  const responses = [
    "I understand your question about ",
    "That's an interesting point. Let me think about ",
    "Based on what you've mentioned regarding ",
    "I can help you with ",
  ];

  const baseResponse =
    responses[Math.floor(Math.random() * responses.length)] +
    userInput.toLowerCase();
  const fullResponse =
    baseResponse +
    ". Here's what I think would be most helpful for your situation.";

  const words = fullResponse.split(" ");
  let currentText = "";

  async function* streamGenerator() {
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 100),
      );
      currentText += (i > 0 ? " " : "") + words[i];
      yield currentText;
    }
  }

  return {
    stream: streamGenerator(),
    model: "simulated-model",
  };
};

/**
 * Parses Server-Sent Events stream from the API (backend sends structured JSON events)
 */
async function* parseSSEStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Split by lines to handle multiple events in one chunk
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.delta) {
              yield data.delta;
            } else if (data.type === 'final' && data.message) {
              yield data.message.content;
              return; // Final message received
            } else if (data.type === 'done') {
              return;
            }
          } catch (e) {
            console.warn("Failed to parse SSE data:", line);
          }
        } else if (line.trim()) {
          // Handle plain text chunks as fallback
          yield line;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function ChatApp({ initialChatId }: { initialChatId?: string } = {}) {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCitations, setShowCitations] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNewChat, setCreatingNewChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load chats from backend
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
        if (chatsData.length > 0 && !activeChatId) {
          setActiveChatId(chatsData[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }, [activeChatId]);

  // Load messages for active chat
  const loadMessages = useCallback(async (chatId: string) => {
    if (!chatId) return;
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const messagesData = await response.json();
        const formattedMessages: Message[] = messagesData.map((msg: Message) => ({
          id: msg.id,
          chat_id: msg.chat_id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        }));
        setMessages(formattedMessages);
      } else {
        // New chat or error - start with welcome message
        setMessages([
          {
            id: "welcome",
            chat_id: chatId,
            role: "assistant",
            content: "Hello! I'm your AI assistant. How can I help you today?",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([
        {
          id: "welcome",
          chat_id: chatId,
          role: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  // Create new chat via backend
  const createChatInBackend = useCallback(async (title?: string) => {
    setCreatingNewChat(true);
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats((prev) => [newChat, ...prev]);
        
        // Set the welcome message
        const welcomeMessage = {
          id: "welcome",
          chat_id: newChat.id,
          role: "assistant" as const,
          content: "Hello! I'm your AI assistant. How can I help you today?",
          created_at: new Date().toISOString(),
        };
        
        setMessages([welcomeMessage]);
        setActiveChatId(newChat.id);
        
        return newChat;
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setCreatingNewChat(false);
    }
    return null;
  }, []);

  // Initial load
  useEffect(() => {
    const initializeApp = async () => {
      await loadChats();
      // If we have an initialChatId, set it as active
      if (initialChatId) {
        setActiveChatId(initialChatId);
      }
      // Don't create a default chat automatically - let user initiate first conversation
    };
    initializeApp();
  }, [initialChatId]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId && !creatingNewChat) {
      // Clear messages immediately to prevent duplication
      setMessages([]);
      loadMessages(activeChatId);
    } else if (!activeChatId) {
      setMessages([]);
    }
  }, [activeChatId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const createChat = useCallback(async () => {
    await createChatInBackend(`Chat ${chats.length + 1}`);
    setGlobalError(null);
  }, [chats.length, createChatInBackend]);

  const saveAsNewChat = useCallback(async () => {
    if (messages.length === 0) return;

    const activeChat = chats.find((c) => c.id === activeChatId);
    const title = `Copy of ${activeChat?.title || "Chat"}`;
    await createChatInBackend(title);
    // The new chat will start empty, user can continue the conversation
  }, [messages, chats, activeChatId, createChatInBackend]);

  const beginRename = useCallback((chat: ChatRow) => {
    setRenamingChatId(chat.id);
    setRenameValue(chat.title);
  }, []);

  const submitRename = useCallback(
    async (chatId: string) => {
      if (!renameValue.trim()) {
        setRenamingChatId(null);
        return;
      }

      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: renameValue.trim() }),
        });

        if (response.ok) {
          const updatedChat = await response.json();
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId ? { ...c, title: updatedChat.title } : c,
            ),
          );
        } else {
          console.error("Failed to rename chat");
        }
      } catch (error) {
        console.error("Error renaming chat:", error);
      }
      
      setRenamingChatId(null);
    },
    [renameValue],
  );

  const switchChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setGlobalError(null);
    // Messages will be loaded by the useEffect hook
  }, []);

  // Delete chat via backend
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        
        // If we deleted the active chat, switch to another one or clear
        if (chatId === activeChatId) {
          const remainingChats = chats.filter((c) => c.id !== chatId);
          if (remainingChats.length > 0) {
            setActiveChatId(remainingChats[0].id);
          } else {
            setActiveChatId("");
            setMessages([]);
          }
        }
      } else {
        console.error("Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }, [chats, activeChatId]);

  // Save user message to backend
  const saveUserMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        return savedMessage;
      }
    } catch (error) {
      console.error("Error saving user message:", error);
    }
    return null;
  }, []);

  const sendMessage = async () => {
    if (
      (!input.trim() && uploadedFiles.length === 0) ||
      sending
    )
      return;

    let currentChatId = activeChatId;

    // Create a new chat if none exists
    if (!currentChatId) {
      setCreatingNewChat(true);
      const newChat = await createChatInBackend("New Chat");
      if (!newChat) {
        setCreatingNewChat(false);
        return;
      }
      currentChatId = newChat.id;
      setActiveChatId(newChat.id); // Set the new chat as active
      
      // Update the chats list
      setChats((prevChats) => [newChat, ...prevChats]);
      
      setCreatingNewChat(false);
    }

    setGlobalError(null);
    setSending(true);

    // Build message content with file information
    let messageContent = input;
    if (uploadedFiles.length > 0) {
      const fileList = uploadedFiles
        .map((file) => `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
        .join("\n");
      messageContent =
        uploadedFiles.length > 0 && input.trim()
          ? `${input}\n\nAttached files:\n${fileList}`
          : `Attached files:\n${fileList}`;
    }

    // Save user message to backend first
    const savedUserMessage = await saveUserMessage(currentChatId, messageContent);
    
    // Add user message immediately
    const userMsg: Message = {
      id: savedUserMessage?.id || `user-${Date.now()}`,
      chat_id: currentChatId,
      role: "user",
      content: messageContent,
      created_at: savedUserMessage?.created_at || new Date().toISOString(),
    };

    // Add assistant placeholder for streaming
    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      chat_id: currentChatId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      _streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const currentInput = input;
    const currentFiles = [...uploadedFiles];

    // Clear input and files after sending
    setInput("");
    setUploadedFiles([]);

    try {
      await handleStreamingResponse(
        assistantMsg.id,
        currentInput,
        currentFiles,
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                _streaming: false,
                _error: "Failed to get response. Please try again.",
              }
            : m,
        ),
      );
      setGlobalError(
        "Connection error. Please check your internet connection.",
      );
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
  const handleStreamingResponse = async (
    messageId: string,
    userInput: string,
    files?: File[],
  ) => {
    try {
      let response;

      if (USE_REAL_BACKEND) {
        // Convert current messages to the format expected by streamChat
        const chatMessages: Message[] = messages
          .filter((msg) => !msg._streaming && !msg._error)
          .map((msg) => ({
            id: msg.id,
            chat_id: activeChatId, // Keep using activeChatId here since this uses the current chat state
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          }));

        // Add the current user message
        chatMessages.push({
          id: `user-${Date.now()}`,
          chat_id: activeChatId, // Keep using activeChatId here since this uses the current chat state
          role: "user",
          content: userInput,
          created_at: new Date().toISOString(),
        });

        // Call the real backend via API route
        console.log("🔄 Calling /api/chat/stream with:", {
          messageCount: chatMessages.length,
          lastMessage: chatMessages[chatMessages.length - 1]?.content,
        });

        // Call the streaming API
        const apiResponse = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId: activeChatId, // Keep using activeChatId here since this uses the current chat state
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
          model: "gemini-2.5-flash",
        };
      } else {
        // Use simulation for development
        response = await simulateStreamingResponse(messageId, userInput);
      }

      // Stream the response
      let accumulatedContent = "";
      for await (const chunk of response.stream) {
        accumulatedContent += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: accumulatedContent } : m)),
        );
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, _streaming: false } : m)),
      );
    } catch (error) {
      throw error; // Re-throw to be handled by the calling function
    }
  };

  const retryMessage = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message?._error) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, _error: undefined, _streaming: true, content: "" }
            : m,
        ),
      );

      handleStreamingResponse(messageId, "retry request").catch(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, _streaming: false, _error: "Retry failed" }
              : m,
          ),
        );
      });
    },
    [messages],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault();
            createChat();
            break;
          case "k":
            e.preventDefault();
            setSearchQuery("");
            document
              .querySelector<HTMLInputElement>(
                '[placeholder="Search chats..."]',
              )
              ?.focus();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createChat]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  // File upload handlers
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        const newFiles = Array.from(files);
        setUploadedFiles((prev) => [...prev, ...newFiles]);

        // Reset the input so the same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chats...</p>
          </div>
        </div>
      ) : (
        <>
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
              title="Create new chat (Ctrl+N)"
            >
              + New
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search chats... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8"
            />
            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              🔍
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredChats.map((chat) => (
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        beginRename(chat);
                      }}
                      title="Rename chat"
                    >
                      ✎
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm("Are you sure you want to delete this chat?")
                        ) {
                          deleteChat(chat.id);
                        }
                      }}
                      title="Delete chat"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredChats.length === 0 && searchQuery && (
            <div className="text-center text-muted-foreground text-sm p-4">
              No chats found matching &quot;{searchQuery}&quot;
            </div>
          )}

          {chats.length === 0 && !searchQuery && (
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
          <div className="flex items-center justify-between">
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

            {/* Chat Actions */}
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveAsNewChat}
                  disabled={sending}
                  className="h-8 px-3"
                >
                  Save as New
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCitations(!showCitations)}
                className="h-8 px-3"
              >
                {showCitations ? "Hide Sources" : "Show Sources"}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex">
          {/* Main Messages Panel */}
          <div
            className={`flex-1 flex flex-col ${showCitations ? "border-r border-border" : ""}`}
          >
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
          </div>

          {/* Source Citations Panel */}
          {showCitations && (
            <div className="w-80 bg-card p-4 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-3">
                Sources & Citations
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="font-medium text-sm mb-1">
                    Knowledge Base Document
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Last updated: {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    This information was retrieved from your uploaded documents
                    and knowledge base.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="font-medium text-sm mb-1">
                    AI Model Response
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Generated by:{" "}
                    {USE_REAL_BACKEND ? "Gemini API" : "Simulation"}
                  </div>
                  <div className="text-sm">
                    Response generated based on conversation context and
                    available knowledge.
                  </div>
                </div>

                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm p-4">
                    Sources will appear here when you start chatting
                  </div>
                )}
              </div>
            </div>
          )}
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
          {/* Show uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-sm text-muted-foreground">
                Uploaded files:
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
                  >
                    <span className="text-primary">📄</span>
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
            />

            {/* Upload button */}
            <Button
              type="button"
              variant="outline"
              disabled={!activeChat || sending}
              onClick={triggerFileInput}
              className="h-12 px-4"
              title="Upload documents"
            >
              <span className="text-lg">📎</span>
            </Button>

            <Button
              type="submit"
              disabled={
                !activeChat ||
                (!input.trim() && uploadedFiles.length === 0) ||
                sending
              }
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
      </>
      )}
    </div>
  );
}

export { ChatApp };

export default function ChatPage() {
  return <ChatApp />;
}
