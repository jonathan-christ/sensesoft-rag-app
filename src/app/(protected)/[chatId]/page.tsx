import { ChatApp } from "../chat/page";

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  // For now, we'll use the same ChatApp component
  // In the future, this could be enhanced to load specific chat data
  return <ChatApp />;
}
