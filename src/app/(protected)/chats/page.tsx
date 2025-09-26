"use client";
import { useEffect, useRef, useState } from "react";
import { useChatApp } from "@/features/chat/hooks/useChatApp";
import { ChatSidebar } from "@/features/chat/components/ChatSidebar";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { MessagesPanel } from "@/features/chat/components/MessagesPanel";
import { CitationsPanel } from "@/features/chat/components/CitationsPanel";
import { GlobalErrorBanner } from "@/features/chat/components/GlobalErrorBanner";
import { ChatInput } from "@/features/chat/components/ChatInput";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";

function ProtectedHomeAppInner({ initialChatId }: { initialChatId?: string }) {
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
      // Clear the message from the URL after sending
      router.replace("/"); // Redirect to the protected root without the message param
    }
  }, [initialMessage, ctx, router]);

  const activeTitle = ctx.activeChat ? ctx.activeChat.title : "Select a chat";

  // Home page specific logic adapted for useChatApp
  function handleQuestionClick(question: string) {
    ctx.setInput(question);
    ctx.sendMessage();
  }

  if (ctx.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
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
          <div
            className={`flex-1 flex flex-col min-h-0 ${ctx.showCitations ? "border-r border-border" : ""}`}
          >
            {!ctx.activeChat ? (
              // Home page UI when no active chat
              <div className="flex-1 flex flex-col items-center justify-center px-4 bg-gray-50">
                <div className="max-w-3xl w-full space-y-8">
                  {/* Welcome Message */}
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-[#ffb81c] rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      Welcome to Akkodis AI
                    </h2>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                      Start a conversation to get instant answers from your
                      documents using advanced AI technology.
                    </p>
                  </div>

                  {/* Example Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() =>
                        handleQuestionClick(
                          "Summarize the key points from the uploaded manual",
                        )
                      }
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="text-sm font-medium mb-1 text-gray-900">
                        Document Summary
                      </div>
                      <div className="text-xs text-gray-500">
                        "Summarize the key points from the uploaded
                        manual"
                      </div>
                    </div>
                    <div
                      onClick={() =>
                        handleQuestionClick(
                          "What are the installation requirements?",
                        )
                      }
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="text-sm font-medium mb-1 text-gray-900">
                        Installation Guide
                      </div>
                      <div className="text-xs text-gray-500">
                        "What are the installation requirements?"
                      </div>
                    </div>
                    <div
                      onClick={() =>
                        handleQuestionClick(
                          "Compare features between product versions",
                        )
                      }
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="text-sm font-medium mb-1 text-gray-900">
                        Feature Comparison
                      </div>
                      <div className="text-xs text-gray-500">
                        "Compare features between product versions"
                      </div>
                    </div>
                    <div
                      onClick={() =>
                        handleQuestionClick(
                          "Explain the technical specifications in detail",
                        )
                      }
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
                    >
                      <div className="text-sm font-medium mb-1 text-gray-900">
                        Technical Specs
                      </div>
                      <div className="text-xs text-gray-500">
                        "Explain the technical specifications in
                        detail"
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <MessagesPanel
                messages={ctx.messages}
                retryMessage={ctx.retryMessage}
                bottomRef={ctx.bottomRef}
              />
            )}
          </div>

          <CitationsPanel
            show={ctx.showCitations}
            messagesLength={ctx.messages.length}
            backendLabel={"Gemini API"}
          />
        </div>

        {ctx.globalError && (
          <GlobalErrorBanner
            message={ctx.globalError}
            onClose={() => ctx.setGlobalError(null)}
          />
        )}

        <ChatInput
          input={ctx.input}
          setInput={ctx.setInput}
          activeChatPresent={!!ctx.activeChat}
          sending={ctx.sending}
          onSubmit={ctx.sendMessage}
        />
      </div>
    </div>
  );
}

export default function ProtectedHomeApp(props: { initialChatId?: string }) {
  return <ProtectedHomeAppInner initialChatId={props.initialChatId} />;
}
