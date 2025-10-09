"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef, MouseEvent } from "react";
import {
  FileText,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/features/auth/lib/supabase/client";
import { AuthSection } from "./auth-section";
import { LinkItem } from "./link-item";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import type { ChatRow } from "@/lib/types";
import {
  ChatAppProvider,
  useChatContext,
} from "@/features/chat/context/ChatContext";

export default function SidebarShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setAuthEmail(data.user?.email ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAuthEmail(session?.user?.email ?? null);
      },
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const navItems = [
    {
      href: "/docs",
      label: "Documents",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const inScope =
    navItems.some((item) => isActive(item.href)) ||
    pathname.startsWith("/chats");

  if (!inScope) return <>{children}</>;

  const sharedProps = {
    navItems,
    authEmail,
    authLoading,
    onLogout: async () => {
      await supabase.auth.signOut();
      router.push("/login");
    },
    children,
    pathname,
  } as const;

  return (
    <ChatAppProvider>
      <ChatSidebarLayout {...sharedProps} />
    </ChatAppProvider>
  );
}

interface SidebarLayoutProps {
  navItems: { href: string; label: string; icon: React.ReactNode }[];
  authEmail: string | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
  pathname: string;
  chat?: ChatSidebarProps;
}

function BaseSidebarLayout({
  navItems,
  authEmail,
  authLoading,
  onLogout,
  chat,
  children,
  pathname,
}: SidebarLayoutProps & { chat?: ChatSidebarProps }) {
  return (
    <div className="flex h-screen">
      <aside className="group flex flex-col bg-card border-r border-border w-14 hover:w-56 transition-[width] duration-200 overflow-hidden">
        <LogoBlock />
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => (
            <LinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathnameMatches(item.href, pathname)}
            />
          ))}
          {chat && (
            <CreateChatNavButton
              onClick={chat.createChat}
              disabled={chat.sending}
            />
          )}
        </nav>
        {chat && (
          <>
            <SidebarDivider />
            <ChatListSection {...chat} />
          </>
        )}
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

  function pathnameMatches(href: string, current: string) {
    if (href === "/docs") {
      return current.startsWith("/docs");
    }
    return current === href;
  }
}

function ChatSidebarLayout(props: SidebarLayoutProps) {
  const ctx = useChatContext();
  const chatProps: ChatSidebarProps = {
    chats: ctx.chats,
    filteredChats: ctx.filteredChats,
    activeChatId: ctx.activeChatId,
    searchQuery: ctx.searchQuery,
    setSearchQuery: ctx.setSearchQuery,
    renamingChatId: ctx.renamingChatId,
    renameValue: ctx.renameValue,
    setRenameValue: ctx.setRenameValue,
    beginRename: ctx.beginRename,
    submitRename: ctx.submitRename,
    deleteChat: ctx.deleteChat,
    switchChat: ctx.switchChat,
    createChat: ctx.createChat,
    sending: ctx.sending,
  };

  return <BaseSidebarLayout {...props} chat={chatProps} />;
}

function LogoBlock() {
  return (
    <div className="p-3 flex items-center justify-center h-12">
      <div className="block group-hover:hidden">
        <Image
          src="/akkodis_logo_small.svg"
          alt="Akkodis"
          width={24}
          height={24}
          priority
        />
      </div>
      <div className="hidden group-hover:block w-full px-3">
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

function SidebarDivider() {
  return <div className="mx-2 my-2 h-px bg-border" />;
}

interface ChatSidebarProps {
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
  createChat: () => void;
  sending: boolean;
}

function ChatListSection({
  filteredChats,
  chats,
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
}: ChatSidebarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchVisible) {
      searchInputRef.current?.focus();
    }
  }, [isSearchVisible]);

  const toggleSearch = () => {
    if (isSearchVisible) {
      setIsSearchVisible(false);
      setSearchQuery("");
      return;
    }
    setIsSearchVisible(true);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex w-full items-center justify-center gap-2 group-hover:justify-start">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          <span className="hidden group-hover:inline">Chats</span>
        </span>
        <div className="hidden group-hover:block">
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={toggleSearch}
            variant={isSearchVisible ? "secondary" : "ghost"}
            title="Toggle chat search"
            aria-label="Toggle chat search"
            aria-pressed={isSearchVisible}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden opacity-0 transition-opacity duration-200 ease-out pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
          {isSearchVisible && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats"
                  className="h-8 pl-8 text-sm"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
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
      </div>
    </div>
  );
}

function CreateChatNavButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!disabled) onClick();
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      role="button"
      aria-label="Create new chat"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={`relative flex w-full items-center justify-center gap-3 py-2 px-0 transition-all duration-200 text-black hover:bg-muted group-hover:px-3 group-hover:justify-start ${
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
      }`}
    >
      <span className="absolute left-0 top-0 h-full w-0.5 bg-transparent" />
      <span className="flex h-6 w-6 items-center justify-center">
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="hidden group-hover:inline truncate">New Chat</span>
    </a>
  );
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
}: {
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
}) {
  const isRenaming = renamingChatId === chat.id;

  return (
    <div
      className={`group relative cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted"}`}
      onClick={() => !sending && switchChat(chat.id)}
    >
      {isRenaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitRename(chat.id);
          }}
        >
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
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
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                beginRename(chat);
              }}
              title="Rename chat"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
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
