import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Send, Paperclip, MessageSquare } from "lucide-react";

import { createClient } from "@/features/auth/lib/supabase/server";
import { LogoutButton } from "@/features/shared/components/logout-button";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load the user's recent chats
  let chats: Array<{
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  }> = [];
  if (user) {
    const { data: userChats } = await supabase
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    chats = userChats ?? [];
  }

  async function createNewChat() {
    "use server";
    // Use the same API flow as Chat page's createChat
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });

      if (res.status === 401) {
        redirect("/login");
      }

      // We don't need the id here; the Chat page will auto-select the most recent chat
      // If needed, we could parse it: const newChat = await res.json();
    } catch (e) {
      // Ignore and continue to redirect; Chat page will handle loading
    }

    redirect("/chat");
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
            <form action={createNewChat}>
              <Button
                type="submit"
                className="w-full bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90 font-medium"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </form>
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
                    href={`/$chat`}
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
            <div className="relative">
              <div className="relative bg-white rounded-xl border border-gray-300 focus-within:border-[#ffb81c] focus-within:ring-1 focus-within:ring-[#ffb81c] transition-colors shadow-sm">
                <Input
                  placeholder="Ask me anything about your documents..."
                  className="w-full bg-transparent border-0 text-gray-900 placeholder-gray-500 px-4 py-4 pr-20 text-base focus:ring-0 focus:outline-none resize-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Press Enter to send • Click 📎 to upload documents
              </div>
            </div>

            {/* Example Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm">
                <div className="text-sm font-medium mb-1 text-gray-900">
                  Placeholder question 1
                </div>
                <div className="text-xs text-gray-500">
                  &quot;Summarize the key points from the uploaded manual&quot;
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm">
                <div className="text-sm font-medium mb-1 text-gray-900">
                  Placeholder question 2
                </div>
                <div className="text-xs text-gray-500">
                  &quot;What are the installation requirements?&quot;
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm">
                <div className="text-sm font-medium mb-1 text-gray-900">
                  Placeholder question 3
                </div>
                <div className="text-xs text-gray-500">
                  &quot;Compare features between product versions&quot;
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors shadow-sm">
                <div className="text-sm font-medium mb-1 text-gray-900">
                  Placeholder question 4
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
