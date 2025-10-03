"use client";

import Image from "next/image";
import type {
  ChangeEvent,
  FormEvent,
  MutableRefObject,
  ReactNode,
  MouseEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, Search, Trash2 } from "lucide-react";

import { useChatContext } from "@/features/chat/context/ChatContext";
import type { ChatRow } from "@/lib/types";
import { SidebarLinkAction } from "./sidebar-shell-links";
import { SidebarDivider } from "./sidebar-shell-shared";
import { AuthSection } from "./auth-section";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";

interface ChatSidebarProps {
  navItems: { href: string; label: string; icon: ReactNode }[];
  authEmail: string | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  pathname: string;
  children: ReactNode;
}

export function ChatSidebar({
  navItems,
  authEmail,
  authLoading,
  onLogout,
  pathname,
  children,
}: ChatSidebarProps) {
  const ctx = useChatContext();
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [showSearch]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) ctx.setSearchQuery("");
      return !prev;
    });
  }, [ctx]);

  return (
    <div className="flex h-screen">
      <aside className="group flex w-14 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 hover:w-56">
        <LogoBlock />
        <nav className="space-y-1 pt-1 px-2">
          {navItems.map((item) => (
            <SidebarLinkAction
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
            />
          ))}
          <SidebarLinkAction
            label="New Chat"
            href="#"
            icon={<MessageSquare className="h-4 w-4" />}
            onClick={() => void ctx.createChat()}
            disabled={ctx.sending || ctx.creatingNewChat}
          />
        </nav>
        <div className="h-full">
          <SidebarDivider />
          <ChatListSection
            chats={ctx.chats}
            filteredChats={ctx.filteredChats}
            activeChatId={ctx.activeChatId}
            searchQuery={ctx.searchQuery}
            setSearchQuery={ctx.setSearchQuery}
            renamingChatId={ctx.renamingChatId}
            renameValue={ctx.renameValue}
            setRenameValue={ctx.setRenameValue}
            beginRename={ctx.beginRename}
            submitRename={ctx.submitRename}
            deleteChat={ctx.deleteChat}
            switchChat={ctx.switchChat}
            sending={ctx.sending}
            showSearch={showSearch}
            toggleSearch={toggleSearch}
            searchInputRef={searchInputRef}
          />
        </div>
        <SidebarDivider />
        <AuthSection
          email={authEmail}
          loading={authLoading}
          onLogout={onLogout}
        />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

interface ChatListSectionProps {
  chats: ChatRow[];
  filteredChats: ChatRow[];
  activeChatId: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  renamingChatId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  beginRename: (chat: ChatRow) => void;
  submitRename: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  switchChat: (chatId: string) => void;
  sending: boolean;
  showSearch: boolean;
  toggleSearch: () => void;
  searchInputRef: MutableRefObject<HTMLInputElement | null>;
}

function ChatListSection({
  chats,
  filteredChats,
  activeChatId,
  searchQuery,
  setSearchQuery,
  renamingChatId,
  renameValue,
  setRenameValue,
  beginRename,
  submitRename,
  deleteChat,
  switchChat,
  sending,
  showSearch,
  toggleSearch,
  searchInputRef,
}: ChatListSectionProps) {
  return (
    <div className="hidden flex-1 flex-col overflow-hidden group-hover:flex">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Chats</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground cursor-pointer"
          onClick={toggleSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div
        className={`${showSearch ? "group-hover:block" : "hidden"} px-3 pb-2`}
      >
        <div className="relative">
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search chats"
            className="h-8 pl-8 text-sm"
          />
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            renamingChatId={renamingChatId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            beginRename={beginRename}
            submitRename={submitRename}
            deleteChat={deleteChat}
            switchChat={switchChat}
            sending={sending}
          />
        ))}
        {filteredChats.length === 0 && searchQuery && (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            No chats found
          </div>
        )}
        {chats.length === 0 && !searchQuery && (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            No chats yet. Create your first chat.
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatListItemProps {
  chat: ChatRow;
  active: boolean;
  renamingChatId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  beginRename: (chat: ChatRow) => void;
  submitRename: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  switchChat: (chatId: string) => void;
  sending: boolean;
}

function ChatListItem({
  chat,
  active,
  renamingChatId,
  renameValue,
  setRenameValue,
  beginRename,
  submitRename,
  deleteChat,
  switchChat,
  sending,
}: ChatListItemProps) {
  const isRenaming = renamingChatId === chat.id;

  return (
    <div
      className={`group relative rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted"}`}
      onClick={() => !sending && switchChat(chat.id)}
    >
      {isRenaming ? (
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submitRename(chat.id);
          }}
        >
          <Input
            autoFocus
            value={renameValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setRenameValue(event.target.value)
            }
            onBlur={() => submitRename(chat.id)}
            className="h-8 text-sm"
          />
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">
              {chat.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(chat.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                beginRename(chat);
              }}
              title="Rename chat"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                if (confirm("Delete this chat?")) deleteChat(chat.id);
              }}
              title="Delete chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogoBlock() {
  return (
    <div className="flex h-12 items-center justify-center p-3">
      <div className="block group-hover:hidden">
        <Image
          src="/akkodis_logo_small.svg"
          alt="Akkodis"
          width={24}
          height={24}
          priority
        />
      </div>
      <div className="hidden w-full px-3 group-hover:block">
        <Image
          src="/akkodis_logo.svg"
          alt="Akkodis"
          width={160}
          height={28}
          priority
        />
      </div>
    </div>
  );
}
