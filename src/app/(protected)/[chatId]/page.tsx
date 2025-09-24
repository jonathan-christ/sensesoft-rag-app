"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatApp } from "../chat/page";

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const [isValidChat, setIsValidChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Validate that the chat exists
    const validateChat = async () => {
      try {
        const response = await fetch(`/api/chats/${params.chatId}/messages`);
        if (response.ok || response.status === 404) {
          // Chat exists or it's a new chat - both are valid
          setIsValidChat(true);
        } else if (response.status === 401) {
          // Unauthorized - redirect to login
          router.push("/login");
          return;
        } else {
          // Other error - redirect to main chat
          router.push("/chat");
          return;
        }
      } catch (error) {
        console.error("Error validating chat:", error);
        router.push("/chat");
        return;
      } finally {
        setLoading(false);
      }
    };

    validateChat();
  }, [params.chatId, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!isValidChat) {
    return null; // Will redirect
  }

  // Pass the chatId as a prop to ChatApp (we'll need to modify ChatApp to accept this)
  return <ChatApp initialChatId={params.chatId} />;
}
