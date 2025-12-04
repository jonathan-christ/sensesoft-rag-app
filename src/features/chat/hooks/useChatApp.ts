"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Message, ChatRow, Citation } from "@/lib/types";
import {
  parseSSEStream,
  formatLimitWarning,
  type SSEEvent,
} from "@/features/chat/lib/sse";

export function useChatApp() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const routeChatId = params?.id ?? "";
  const [activeChatId, setActiveChatId] = useState<string>(routeChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCitations, setShowCitations] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingNewChat, setCreatingNewChat] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveChatId(routeChatId);
  }, [routeChatId]);

  // Load chats from backend
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
        if (
          routeChatId &&
          !chatsData.some((chat: ChatRow) => chat.id === routeChatId)
        ) {
          if (chatsData.length > 0) {
            router.replace(`/chats/${chatsData[0].id}`);
          } else {
            router.replace("/chats");
          }
        }
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }, [routeChatId, router]);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string) => {
    if (!chatId) return;
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const messagesData = await response.json();
        const formattedMessages: Message[] = messagesData.map(
          (msg: Message & { citations?: Citation[] }) => ({
            id: msg.id,
            chat_id: msg.chat_id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
            citations: msg.citations,
          }),
        );
        setMessages(formattedMessages);
      } else {
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
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Create chat
  const createChatInBackend = useCallback(
    async (title?: string) => {
      setCreatingNewChat(true);
      try {
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (response.ok) {
          const newChat = await response.json();
          setChats((prev) => [newChat, ...prev]);
          setMessages([
            {
              id: "welcome",
              chat_id: newChat.id,
              role: "assistant",
              content:
                "Hello! I'm your AI assistant. How can I help you today?",
              created_at: new Date().toISOString(),
            },
          ]);
          setActiveChatId(newChat.id);
          router.push(`/chats/${newChat.id}`);
          return newChat as ChatRow;
        }
      } catch (error) {
        console.error("Error creating chat:", error);
      } finally {
        setCreatingNewChat(false);
      }
      return null;
    },
    [router],
  );

  // Initial load
  useEffect(() => {
    (async () => {
      await loadChats();
    })();
  }, [loadChats]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId && !creatingNewChat) {
      setMessages([]);
      setCitations([]); // Clear citations when switching chats
      loadMessages(activeChatId);
    } else if (!activeChatId) {
      setMessages([]);
      setCitations([]);
    }
  }, [activeChatId, creatingNewChat, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [chats, searchQuery],
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
          headers: { "Content-Type": "application/json" },
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

  const cancelRename = useCallback(() => {
    setRenamingChatId(null);
    setRenameValue("");
  }, []);

  const switchChat = useCallback(
    (chatId: string) => {
      if (!chatId) return;
      setActiveChatId(chatId);
      setGlobalError(null);
      router.push(`/chats/${chatId}`);
    },
    [router],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          let nextActiveId: string | null = null;
          let cleared = false;

          setChats((prev) => {
            const next = prev.filter((c) => c.id !== chatId);
            if (chatId === activeChatId) {
              if (next.length > 0) {
                nextActiveId = next[0].id;
              } else {
                cleared = true;
              }
            }
            return next;
          });

          if (chatId === activeChatId) {
            if (nextActiveId) {
              setActiveChatId(nextActiveId);
              router.push(`/chats/${nextActiveId}`);
            } else if (cleared) {
              setActiveChatId("");
              setMessages([]);
              setCitations([]);
              router.push("/chats");
            }
          }
        } else {
          console.error("Failed to delete chat");
        }
      } catch (error) {
        console.error("Error deleting chat:", error);
      }
    },
    [activeChatId, router],
  );

  const saveUserMessage = useCallback(
    async (chatId: string, content?: string, audioUrl?: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, audioUrl }),
        });
        if (response.ok) return await response.json();
      } catch (error) {
        console.error("Error saving user message:", error);
      }
      return null;
    },
    [],
  );

  const handleStreamingResponse = useCallback(
    async (messageId: string, userInput: string) => {
      // Build chat history for context
      const chatMessages: Message[] = messages
        .filter((m) => !m._streaming && !m._error)
        .map((m) => ({
          id: m.id,
          chat_id: activeChatId,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        }));
      chatMessages.push({
        id: `user-${Date.now()}`,
        chat_id: activeChatId,
        role: "user",
        content: userInput,
        created_at: new Date().toISOString(),
      });

      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          messages: chatMessages,
          temperature: 0.7,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`API call failed: ${apiResponse.status}`);
      }

      let acc = "";
      let newCitations: Citation[] = [];
      let limitNotice: string | undefined;
      let streamError: string | undefined;

      for await (const event of parseSSEStream(apiResponse)) {
        switch (event.type) {
          case "token":
            acc += event.delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, content: acc } : m,
              ),
            );
            break;

          case "sources":
            // Handle citations from the stream and store them in the message
            newCitations = event.items.map((item) => ({
              chunkId: item.chunkId,
              documentId: item.documentId,
              filename: item.filename,
              similarity: item.similarity,
            }));
            setCitations(newCitations);
            // Also store citations in the message for individual access
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, citations: newCitations } : m,
              ),
            );
            break;

          case "limit":
            // Response hit token limit - store notice for display
            limitNotice = formatLimitWarning(event.tokens);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, _limitNotice: limitNotice } : m,
              ),
            );
            break;

          case "error":
            // Server-side error during generation
            streamError = event.message;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? { ...m, _streaming: false, _error: streamError }
                  : m,
              ),
            );
            setGlobalError(event.message);
            return; // Stop processing on error

          case "final":
          case "done":
            // Stream completed successfully
            break;
        }
      }

      // Finalize message state (if no error occurred)
      if (!streamError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, _streaming: false, _limitNotice: limitNotice }
              : m,
          ),
        );
      }
    },
    [messages, activeChatId],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    let currentChatId = activeChatId;
    if (!currentChatId) {
      setCreatingNewChat(true);
      const newChat = await createChatInBackend("New Chat");
      if (!newChat) {
        setCreatingNewChat(false);
        return;
      }
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
      setChats((prev) => [newChat, ...prev]);
      setCreatingNewChat(false);
    }
    setGlobalError(null);
    setSending(true);
    // Clear previous citations when sending a new message
    setCitations([]);

    const messageContent = input;
    const saved = await saveUserMessage(currentChatId, messageContent);
    const userMsg: Message = {
      id: saved?.id || `user-${Date.now()}`,
      chat_id: currentChatId,
      role: "user",
      content: messageContent,
      created_at: saved?.created_at || new Date().toISOString(),
    };
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
    setInput("");
    try {
      await handleStreamingResponse(assistantMsg.id, currentInput);
    } catch {
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
  }, [
    input,
    sending,
    activeChatId,
    saveUserMessage,
    handleStreamingResponse,
    createChatInBackend,
  ]);

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
    [messages, handleStreamingResponse],
  );

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId),
    [chats, activeChatId],
  );

  const sendAudioMessage = useCallback(
    async (audioUrl: string) => {
      if (sending) return;

      let currentChatId = activeChatId;
      if (!currentChatId) {
        setCreatingNewChat(true);
        const newChat = await createChatInBackend("New Chat");
        if (!newChat) {
          setCreatingNewChat(false);
          return;
        }
        currentChatId = newChat.id;
        setActiveChatId(newChat.id);
        setChats((prev) => [newChat, ...prev]);
        setCreatingNewChat(false);
      }

      setGlobalError(null);
      setSending(true);
      setCitations([]);

      try {
        // Save the audio message (backend will transcribe it)
        const saved = await saveUserMessage(currentChatId, undefined, audioUrl);

        if (!saved) {
          throw new Error("Failed to save audio message");
        }

        const userMsg: Message = {
          id: saved.id,
          chat_id: currentChatId,
          role: "user",
          content: saved.content || "🎤 Audio message", // fallback if transcription fails
          audio_url: audioUrl,
          created_at: saved.created_at,
        };

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          chat_id: currentChatId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          _streaming: true,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);

        // Use the transcribed content for the AI response
        const transcribedContent = saved.content || "";
        await handleStreamingResponse(assistantMsg.id, transcribedContent);
      } catch (error) {
        console.error("Error sending audio message:", error);
        setGlobalError("Failed to send audio message. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [
      sending,
      activeChatId,
      saveUserMessage,
      handleStreamingResponse,
      createChatInBackend,
    ],
  );

  /**
   * Select a message and display its citations.
   * Opens the citations panel if not already open.
   */
  const selectMessage = useCallback(
    (messageId: string, messageCitations: Citation[]) => {
      setSelectedMessageId(messageId);
      setCitations(messageCitations);
      if (!showCitations) {
        setShowCitations(true);
      }
    },
    [showCitations],
  );

  /**
   * Clear message selection (e.g., when panel closes).
   */
  const clearMessageSelection = useCallback(() => {
    setSelectedMessageId(null);
  }, []);

  return {
    // state
    chats,
    activeChatId,
    messages,
    input,
    sending,
    globalError,
    renamingChatId,
    renameValue,
    searchQuery,
    showCitations,
    citations,
    loading,
    messagesLoading,
    creatingNewChat,
    selectedMessageId,
    bottomRef,
    filteredChats,
    activeChat,
    // setters
    setInput,
    setSearchQuery,
    setRenameValue,
    setShowCitations,
    setGlobalError,
    // actions
    beginRename,
    submitRename,
    cancelRename,
    switchChat,
    deleteChat,
    createChat,
    saveAsNewChat,
    retryMessage,
    sendMessage,
    sendAudioMessage,
    selectMessage,
    clearMessageSelection,
  } as const;
}
