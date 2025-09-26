"use client";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import type { ChatRow } from "@/lib/types";
import { Search, Pencil, Trash2 } from "lucide-react";

export function ChatSidebar(props: {
  chats: ChatRow[];
  activeChatId: string;
  filteredChats: ChatRow[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  renamingChatId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  beginRename: (chat: ChatRow) => void;
  submitRename: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  switchChat: (chatId: string) => void;
  createChat: () => void;
  sending: boolean;
}) {
  const {
    chats,
    activeChatId,
    filteredChats,
    searchQuery,
    setSearchQuery,
    renamingChatId,
    renameValue,
    setRenameValue,
    beginRename,
    submitRename,
    deleteChat,
    switchChat,
    createChat,
    sending,
  } = props;

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col sticky top-0 h-screen min-h-0">
      <div className="p-4 border-b border-border sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button
            size="sm"
            onClick={createChat}
            disabled={sending}
            className="h-8 px-3"
            title="Create new chat (Ctrl+N)"
          >
            + New
          </Button>
        </div>
        <div className="relative">
          <Input
            placeholder="Search chats... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            className={`group relative mb-1 rounded-lg p-3 cursor-pointer transition-colors ${chat.id === activeChatId ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"}`}
            onClick={() => !sending && switchChat(chat.id)}
          >
            {renamingChatId === chat.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename(chat.id);
                }}
                className="flex gap-2"
              >
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(chat.id)}
                  className="h-7 text-sm"
                />
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {chat.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      beginRename(chat);
                    }}
                    title="Rename chat"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this chat?"))
                        deleteChat(chat.id);
                    }}
                    title="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredChats.length === 0 && searchQuery && (
          <div className="text-center text-muted-foreground text-sm p-4">
            No chats found matching &quot;{searchQuery}&quot;
          </div>
        )}
        {chats.length === 0 && !searchQuery && (
          <div className="text-center text-muted-foreground text-sm p-4">
            No chats yet. Create your first chat!
          </div>
        )}
      </div>
    </div>
  );
}
