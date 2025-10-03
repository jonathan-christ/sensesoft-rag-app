"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useChatApp } from "@/features/chat/hooks/useChatApp";

export type ChatContextValue = ReturnType<typeof useChatApp>;

const ChatAppContext = createContext<ChatContextValue | null>(null);

export function ChatAppProvider({ children }: { children: ReactNode }) {
  const value = useChatApp();
  return (
    <ChatAppContext.Provider value={value}>{children}</ChatAppContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatAppContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within ChatAppProvider");
  }
  return ctx;
}
