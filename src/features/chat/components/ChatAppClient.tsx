"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { useChatContext } from "../context/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { MessagesPanel } from "./MessagesPanel";
import { CitationsPanel } from "./CitationsPanel";
import { GlobalErrorBanner } from "./GlobalErrorBanner";
import { ChatInput } from "./ChatInput";
import { ResizableSplitter } from "@/features/shared/components/ui/resizable-splitter";
import LoadingSpinner from "@/features/shared/components/loading-spinner";

/** Default width for the citations panel (px) */
const DEFAULT_PANEL_WIDTH = 280;
const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 480;

export function ChatAppClient() {
  const ctx = useChatContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentInitial = useRef(false);
  const initialMessage = searchParams.get("message");
  const [citationsPanelWidth, setCitationsPanelWidth] =
    useState(DEFAULT_PANEL_WIDTH);

  useEffect(() => {
    const savedWidth = localStorage.getItem("citationsPanelWidth");
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        setCitationsPanelWidth(width);
      }
    }
  }, []);

  const handleWidthChange = (width: number) => {
    setCitationsPanelWidth(width);
    localStorage.setItem("citationsPanelWidth", width.toString());
  };

  useEffect(() => {
    if (!sentInitial.current && initialMessage) {
      sentInitial.current = true;
      ctx.setInput(initialMessage);
      setTimeout(() => ctx.sendMessage(), 0);
      router.replace("/chats");
    }
  }, [initialMessage, ctx, router]);

  const activeTitle = ctx.activeChat ? ctx.activeChat.title : "Select a chat";

  function handleQuestionClick(question: string) {
    ctx.setInput(question);
    ctx.sendMessage();
  }

  if (ctx.loading) {
    return <LoadingSpinner label="chats" />;
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ChatHeader
          title={activeTitle}
          sending={ctx.sending}
          messagesCount={ctx.messages.length}
          onSaveAsNew={ctx.saveAsNewChat}
          showCitations={ctx.showCitations}
          toggleCitations={() => ctx.setShowCitations(!ctx.showCitations)}
        />

        <ResizableSplitter
          showRightPanel={ctx.showCitations}
          initialWidth={citationsPanelWidth}
          minWidth={MIN_PANEL_WIDTH}
          maxWidth={MAX_PANEL_WIDTH}
          onWidthChange={handleWidthChange}
          className="flex-1"
          leftPanel={
            <div className="flex-1 flex flex-col min-h-0">
              {!ctx.activeChat ? (
                <div className="flex-1 flex flex-col items-center justify-center px-4 bg-gray-50">
                  <div className="max-w-3xl w-full space-y-8">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SuggestionCard
                        title="Document Summary"
                        description={
                          "Summarize the key points from the uploaded manual"
                        }
                        onClick={() =>
                          handleQuestionClick(
                            "Summarize the key points from the uploaded manual",
                          )
                        }
                      />
                      <SuggestionCard
                        title="Installation Guide"
                        description={"What are the installation requirements?"}
                        onClick={() =>
                          handleQuestionClick(
                            "What are the installation requirements?",
                          )
                        }
                      />
                      <SuggestionCard
                        title="Feature Comparison"
                        description={
                          "Compare features between product versions"
                        }
                        onClick={() =>
                          handleQuestionClick(
                            "Compare features between product versions",
                          )
                        }
                      />
                      <SuggestionCard
                        title="Technical Specs"
                        description={
                          "Explain the technical specifications in detail"
                        }
                        onClick={() =>
                          handleQuestionClick(
                            "Explain the technical specifications in detail",
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <MessagesPanel
                  messages={ctx.messages}
                  retryMessage={ctx.retryMessage}
                  bottomRef={ctx.bottomRef}
                  loading={ctx.messagesLoading}
                  selectedMessageId={ctx.selectedMessageId}
                  onMessageSelect={ctx.selectMessage}
                />
              )}
            </div>
          }
          rightPanel={
            <CitationsPanel
              show={ctx.showCitations}
              messages={ctx.messages}
              selectedCitations={
                ctx.selectedMessageId ? ctx.citations : undefined
              }
              isSelectedView={!!ctx.selectedMessageId}
              backendLabel="Gemini API"
            />
          }
        />

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
          onAudioSubmit={ctx.sendAudioMessage}
        />
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
    >
      <div className="text-sm font-medium mb-1 text-gray-900">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}
