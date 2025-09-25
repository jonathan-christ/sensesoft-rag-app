"use client";
import { useEffect, useRef } from "react";
import { useChatApp } from "@/features/chat/hooks/useChatApp";
import { ChatSidebar } from "@/features/chat/components/ChatSidebar";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { MessagesPanel } from "@/features/chat/components/MessagesPanel";
import { CitationsPanel } from "@/features/chat/components/CitationsPanel";
import { GlobalErrorBanner } from "@/features/chat/components/GlobalErrorBanner";
import { ChatInput } from "@/features/chat/components/ChatInput";
import { useRouter, useSearchParams } from "next/navigation";

function ChatAppInner({ initialChatId }: { initialChatId?: string }) {
  const ctx = useChatApp(initialChatId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentInitial = useRef(false);
  const initialMessage = searchParams.get("message");

  useEffect(() => {
    if (!sentInitial.current && initialMessage) {
      sentInitial.current = true;
      ctx.setInput(initialMessage);
      setTimeout(() => ctx.sendMessage(), 0);
      router.replace("/chat");
    }
  }, [initialMessage]);
  const activeTitle = ctx.activeChat ? ctx.activeChat.title : "Select a chat";
  return (
    <div className="flex h-screen bg-background">
      {ctx.loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading chats...</p>
          </div>
        </div>
      ) : (
        <>
          <ChatSidebar
            chats={ctx.chats}
            activeChatId={ctx.activeChatId}
            filteredChats={ctx.filteredChats}
            searchQuery={ctx.searchQuery}
            setSearchQuery={ctx.setSearchQuery}
            renamingChatId={ctx.renamingChatId}
            renameValue={ctx.renameValue}
            setRenameValue={ctx.setRenameValue}
            beginRename={ctx.beginRename}
            submitRename={ctx.submitRename}
            deleteChat={ctx.deleteChat}
            switchChat={ctx.switchChat}
            createChat={ctx.createChat}
            sending={ctx.sending}
          />

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ChatHeader
              title={activeTitle}
              sending={ctx.sending}
              messagesCount={ctx.messages.length}
              onSaveAsNew={ctx.saveAsNewChat}
              showCitations={ctx.showCitations}
              toggleCitations={() => ctx.setShowCitations(!ctx.showCitations)}
            />

            <div className="flex-1 flex min-h-0">
              <div className={`flex-1 flex flex-col min-h-0 ${ctx.showCitations ? "border-r border-border" : ""}`}>
                {!ctx.activeChat ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <div className="text-lg mb-2">Welcome to AI Chat</div>
                      <div className="text-sm">Create a new chat or select an existing one to begin</div>
                    </div>
                  </div>
                ) : (
                  <MessagesPanel messages={ctx.messages} retryMessage={ctx.retryMessage} bottomRef={ctx.bottomRef} />
                )}
              </div>

              <CitationsPanel show={ctx.showCitations} messagesLength={ctx.messages.length} backendLabel={"Gemini API"} />
            </div>

            {ctx.globalError && (
              <GlobalErrorBanner message={ctx.globalError} onClose={() => ctx.setGlobalError(null)} />
            )}

            <ChatInput
              input={ctx.input}
              setInput={ctx.setInput}
              activeChatPresent={!!ctx.activeChat}
              sending={ctx.sending}
              onSubmit={ctx.sendMessage}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatApp(props: { initialChatId?: string }) {
  return <ChatAppInner initialChatId={props.initialChatId} />;
}
