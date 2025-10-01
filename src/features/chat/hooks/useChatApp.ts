import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message, ChatRow } from "@/lib/types";
import type { Citation } from "@/features/chat/components/CitationsPanel";

// Backend is enabled in the page; mirror flag here to control streaming path if needed
const USE_REAL_BACKEND = true;

async function* parseSSEStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  if (!reader) throw new Error("No response body");
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token" && data.delta) {
              yield { type: "token", delta: data.delta as string };
            } else if (data.type === "sources" && data.items) {
              yield { type: "sources", items: data.items as Citation[] };
            } else if (data.type === "final" && data.message) {
              yield { type: "final", content: data.message.content as string };
              return;
            } else if (data.type === "done") {
              return;
            }
          } catch {
            // ignore
          }
        } else if (line.trim()) {
          yield { type: "token", delta: line as string };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useChatApp(initialChatId?: string) {
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
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNewChat, setCreatingNewChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  // Load messages for a chat
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

  // Create chat
  const createChatInBackend = useCallback(async (title?: string) => {
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
            content: "Hello! I'm your AI assistant. How can I help you today?",
            created_at: new Date().toISOString(),
          },
        ]);
        setActiveChatId(newChat.id);
        return newChat as ChatRow;
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
    (async () => {
      await loadChats();
      if (initialChatId) setActiveChatId(initialChatId);
    })();
  }, [initialChatId, loadChats]);

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

  const filteredChats = useMemo(() =>
    chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase())),
  [chats, searchQuery]);

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

  const submitRename = useCallback(async (chatId: string) => {
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
        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: updatedChat.title } : c)));
      } else {
        console.error("Failed to rename chat");
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
    setRenamingChatId(null);
  }, [renameValue]);

  const switchChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setGlobalError(null);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (chatId === activeChatId) {
          const remaining = chats.filter((c) => c.id !== chatId);
          if (remaining.length > 0) setActiveChatId(remaining[0].id);
          else {
            setActiveChatId("");
            setMessages([]);
            setCitations([]);
          }
        }
      } else {
        console.error("Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }, [chats, activeChatId]);

  const saveUserMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (response.ok) return await response.json();
    } catch (error) {
      console.error("Error saving user message:", error);
    }
    return null;
  }, []);

  const handleStreamingResponse = useCallback(async (messageId: string, userInput: string) => {
    try {
      let response: { stream: AsyncGenerator<{ type: string; delta?: string; items?: Citation[] }>; model: string } | undefined;
      if (USE_REAL_BACKEND) {
        const chatMessages: Message[] = messages
          .filter((m) => !m._streaming && !m._error)
          .map((m) => ({ id: m.id, chat_id: activeChatId, role: m.role, content: m.content, created_at: m.created_at }));
        chatMessages.push({ id: `user-${Date.now()}`, chat_id: activeChatId, role: "user", content: userInput, created_at: new Date().toISOString() });
        
        const apiResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: activeChatId, messages: chatMessages, temperature: 0.7, max_tokens: 1000 }),
        });
        if (!apiResponse.ok) throw new Error(`API call failed: ${apiResponse.status}`);
        response = { stream: parseSSEStream(apiResponse), model: "gemini-2.5-flash" } as const;
      }
      if (!response) throw new Error("No response stream");
      
      let acc = "";
      let newCitations: Citation[] = [];
      
      for await (const event of response.stream) {
        if (event.type === "token") {
          acc += event.delta;
          setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: acc } : m)));
        } else if (event.type === "sources" && event.items) {
          // Handle citations from the stream
          newCitations = event.items.map((item) => ({
            chunkId: item.chunkId,
            documentId: item.documentId,
            filename: item.filename,
            similarity: item.similarity,
            content: undefined // Content will be fetched by CitationsPanel if needed
          }));
          setCitations(newCitations);
        }
      }
      
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, _streaming: false } : m)));
    } catch (error) {
      throw error;
    }
  }, [messages, activeChatId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    let currentChatId = activeChatId;
    if (!currentChatId) {
      setCreatingNewChat(true);
      const newChat = await createChatInBackend("New Chat");
      if (!newChat) { setCreatingNewChat(false); return; }
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
    const userMsg: Message = { id: saved?.id || `user-${Date.now()}`,
      chat_id: currentChatId, role: "user", content: messageContent, created_at: saved?.created_at || new Date().toISOString() };
    const assistantMsg: Message = { id: `assistant-${Date.now()}`, chat_id: currentChatId, role: "assistant", content: "", created_at: new Date().toISOString(), _streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const currentInput = input;
    setInput("");
    try {
      await handleStreamingResponse(assistantMsg.id, currentInput);
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, _streaming: false, _error: "Failed to get response. Please try again." } : m));
      setGlobalError("Connection error. Please check your internet connection.");
    } finally {
      setSending(false);
    }
  }, [input, sending, activeChatId, saveUserMessage, handleStreamingResponse, createChatInBackend]);

  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?._error) return;
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, _error: undefined, _streaming: true, content: "" } : m));
    handleStreamingResponse(messageId, "retry request").catch(() => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, _streaming: false, _error: "Retry failed" } : m));
    });
  }, [messages, handleStreamingResponse]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);

  return {
    // state
    chats, activeChatId, messages, input, sending, globalError, renamingChatId, renameValue,
    searchQuery, showCitations, citations, loading, creatingNewChat,
    bottomRef, filteredChats, activeChat,
    // setters
    setInput, setSearchQuery, setRenameValue, setShowCitations, setGlobalError,
    // actions
    beginRename, submitRename, switchChat, deleteChat, createChat, saveAsNewChat,
    retryMessage, sendMessage,
  } as const;
}
