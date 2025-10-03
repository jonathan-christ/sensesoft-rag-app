"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { FileText, MessageSquare, Pencil, Search, Trash2 } from "lucide-react";

import { createClient } from "@/features/auth/lib/supabase/client";
import { AuthSection } from "./auth-section";
import { LinkItem } from "./link-item";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import type { ChatRow } from "@/lib/types";
import { ChatAppProvider, useChatContext } from "@/features/chat/context/ChatContext";

export default function SidebarShell({ children }: { children: React.ReactNode }) {
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email ?? null);
    });

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

  const inScope =
    pathname.startsWith("/chats") || navItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!inScope) {
    return <>{children}</>;
  }

  return (
    <ChatAppProvider>
      <SidebarContent
        navItems={navItems}
        authEmail={authEmail}
        authLoading={authLoading}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        pathname={pathname}
      >
        {children}
      </SidebarContent>
    </ChatAppProvider>
  );
}

interface SidebarContentProps {
  navItems: { href: string; label: string; icon: React.ReactNode }[];
  authEmail: string | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  pathname: string;
  children: React.ReactNode;
}

function SidebarContent({ navItems, authEmail, authLoading, onLogout, pathname, children }: SidebarContentProps) {
  const ctx = useChatContext();

  return (
    <div className="flex h-screen">
      <aside className="group flex w-14 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 hover:w-56">
        <LogoBlock />
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => (
            <LinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
          <SidebarAction
            icon={<MessageSquare className="h-4 w-4" />}
            label="New Chat"
            onClick={() => void ctx.createChat()}
            disabled={ctx.sending || ctx.creatingNewChat}
          />
        </nav>
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
        />
        <SidebarDivider />
        <AuthSection email={authEmail} loading={authLoading} onLogout={onLogout} />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function LogoBlock() {
  return (
    <div className="flex h-12 items-center justify-center p-3">
      <div className="block group-hover:hidden">
        <Image src="/akkodis_logo_small.svg" alt="Akkodis" width={24} height={24} priority />
      </div>
      <div className="hidden w-full px-3 group-hover:block">
        <Image src="/akkodis_logo.svg" alt="Akkodis" width={160} height={28} priority />
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
  sending: boolean;
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
}: ChatSidebarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [showSearch]);

  const toggleSearch = () => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchQuery("");
      }
      return !prev;
    });
  };

  return (
    <div className="hidden flex-1 flex-col overflow-hidden group-hover:flex">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Chats</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={toggleSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className={`${showSearch ? "group-hover:block" : "hidden"} px-3 pb-2`}>
        <div className="relative">
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="px-2 py-4 text-xs text-muted-foreground">No chats found</div>
        )}
        {chats.length === 0 && !searchQuery && (
          <div className="px-2 py-4 text-xs text-muted-foreground">No chats yet. Create your first chat.</div>
        )}
      </div>
    </div>
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
      className={`group relative rounded-md border px-3 py-2 text-sm transition-colors ${active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted"}`}
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
            <div className="truncate font-medium text-foreground">{chat.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(chat.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
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
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
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

function SidebarAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center justify-center gap-3 px-0 py-2 text-left transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 group-hover:justify-start group-hover:px-3"
    >
      <span className="absolute left-0 top-0 h-full w-0.5 bg-transparent" />
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="hidden whitespace-nowrap group-hover:inline">{label}</span>
    </button>
  );
}
