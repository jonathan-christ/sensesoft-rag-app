"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Send, Paperclip, MessageSquare } from "lucide-react";

import { createClient } from "@/features/auth/lib/supabase/client";
import { LogoutButton } from "@/features/shared/components/logout-button";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import type { User } from "@supabase/supabase-js";

interface Chat {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        const { data: userChats } = await supabase
          .from("chats")
          .select("id, title, created_at, updated_at")
          .eq("user_id", currentUser.id)
          .order("updated_at", { ascending: false });

        setChats(userChats ?? []);
      }

      setLoading(false);
    }

    loadUserData();
  }, []);

  async function createNewChatWithMessage(message: string) {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Create a new chat
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.ok) {
        const newChat = await response.json();
        // Redirect to chat page with the message as a URL parameter
        router.push(`/chat?message=${encodeURIComponent(message)}`);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      // Fallback: just go to chat page with the message
      router.push(`/chat?message=${encodeURIComponent(message)}`);
    }
  }

  async function handleCreateNewChat() {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
    } catch (e) {
      // Ignore and continue to redirect; Chat page will handle loading
    }

    router.push("/chat");
  }

  function handleInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      createNewChatWithMessage(inputValue.trim());
    }
  }

  function handleQuestionClick(question: string) {
    createNewChatWithMessage(question);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm sticky top-0 h-screen min-h-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Image
              src="/akkodis_logo.svg"
              alt="Akkodis"
              width={120}
              height={24}
              priority
              className="h-6 w-auto"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          {user ? (
            <Button
              onClick={handleCreateNewChat}
              className="w-full bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90 font-medium"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          ) : (
            <Link href="/login">
              <Button className="w-full bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90 font-medium">
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </Link>
          )}
        </div>

        {/* Recent Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
              {user ? "Your Chats" : "Recent"}
            </h3>
            <div className="space-y-1">
              {user && chats.length > 0 ? (
                chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href="/chat"
                    className="block p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">
                      {chat.title || "Untitled chat"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(
                        chat.updated_at || chat.created_at,
                      ).toLocaleDateString()}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-gray-500">
                  {user
                    ? "No chats yet. Start a new conversation!"
                    : "Login to see your recent chats."}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Akkodis AI Assistant
              </h1>
              <div className="text-sm text-gray-600">
                Ask questions about your documents
              </div>
            </div>

            {/* Auth buttons moved to top right */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 text-sm">Welcome back!</span>
                  <LogoutButton />
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-gray-100"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Chat Area */}
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
                Start a conversation to get instant answers from your documents
                using advanced AI technology.
              </p>
            </div>

            {/* Input Box */}
            <form onSubmit={handleInputSubmit} className="relative">
              <div className="relative bg-white rounded-xl border border-gray-300 focus-within:border-[#ffb81c] focus-within:ring-1 focus-within:ring-[#ffb81c] transition-colors shadow-sm">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your documents..."
                  className="w-full bg-transparent border-0 text-gray-900 placeholder-gray-500 px-4 py-4 pr-20 text-base focus:ring-0 focus:outline-none resize-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim()}
                    className="h-8 w-8 bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Press Enter to send • Click 📎 to upload documents
              </div>
            </form>

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
                  &quot;Summarize the key points from the uploaded manual&quot;
                </div>
              </div>
              <div
                onClick={() =>
                  handleQuestionClick("What are the installation requirements?")
                }
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm"
              >
                <div className="text-sm font-medium mb-1 text-gray-900">
                  Installation Guide
                </div>
                <div className="text-xs text-gray-500">
                  &quot;What are the installation requirements?&quot;
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
                  &quot;Compare features between product versions&quot;
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
                  &quot;Explain the technical specifications in detail&quot;
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white">
          © 2025 Akkodis. Engineering a Smarter Future Together.
        </footer>
      </main>
    </div>
  );
}
