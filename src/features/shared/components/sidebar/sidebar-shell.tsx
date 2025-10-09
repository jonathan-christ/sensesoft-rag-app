"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef, MouseEvent } from "react";
import {
  FileText,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  MoreVertical,
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
import { cn } from "@/features/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";

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
      <aside
        className={cn(
          "group flex flex-col bg-card border-r border-border transition-[width] duration-200 overflow-hidden hover:w-56",
          chat?.forceExpanded ? "w-56" : "w-14",
        )}
        data-expanded={chat?.forceExpanded ? "true" : undefined}
      >
        <LogoBlock expanded={chat?.forceExpanded ?? false} />
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => (
            <LinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathnameMatches(item.href, pathname)}
              expanded={chat?.forceExpanded ?? false}
            />
          ))}
          {chat && (
            <CreateChatNavButton
              onClick={chat.createChat}
              disabled={chat.sending}
              expanded={chat.forceExpanded}
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
          expanded={chat?.forceExpanded ?? false}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const forceExpanded = menuOpen || dialogOpen || pendingChatId !== null;
  const chatProps: ChatSidebarProps = {
    chats: ctx.chats,
    filteredChats: ctx.filteredChats,
    activeChatId: ctx.activeChatId,
    searchQuery: ctx.searchQuery,
    setSearchQuery: ctx.setSearchQuery,
    renameValue: ctx.renameValue,
    setRenameValue: ctx.setRenameValue,
    beginRename: ctx.beginRename,
    submitRename: ctx.submitRename,
    cancelRename: ctx.cancelRename,
    deleteChat: ctx.deleteChat,
    switchChat: ctx.switchChat,
    createChat: ctx.createChat,
    sending: ctx.sending,
    forceExpanded,
    setMenuOpen,
    setDialogOpen,
    pendingChatId,
    setPendingChatId,
  };

  return <BaseSidebarLayout {...props} chat={chatProps} />;
}

function LogoBlock({ expanded }: { expanded: boolean }) {
  return (
    <div className="p-3 flex items-center justify-center h-12">
      <div className={cn("block", expanded ? "hidden" : "group-hover:hidden")}>
        <Image
          src="/akkodis_logo_small.svg"
          alt="Akkodis"
          width={24}
          height={24}
          priority
        />
      </div>
      <div
        className={cn(
          "hidden w-full px-3",
          expanded ? "block" : "group-hover:block",
        )}
      >
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
  renameValue: string;
  setRenameValue: (value: string) => void;
  beginRename: (chat: ChatRow) => void;
  submitRename: (chatId: string) => void;
  cancelRename: () => void;
  deleteChat: (chatId: string) => void;
  switchChat: (chatId: string) => void;
  createChat: () => void;
  sending: boolean;
  forceExpanded: boolean;
  setMenuOpen: (value: boolean) => void;
  setDialogOpen: (value: boolean) => void;
  pendingChatId: string | null;
  setPendingChatId: (value: string | null) => void;
}

function ChatListSection({
  filteredChats,
  chats,
  activeChatId,
  searchQuery,
  setSearchQuery,
  renameValue,
  setRenameValue,
  beginRename,
  submitRename,
  cancelRename,
  deleteChat,
  switchChat,
  sending,
  forceExpanded,
  setMenuOpen,
  setDialogOpen,
  pendingChatId,
  setPendingChatId,
}: ChatSidebarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [renameDialogChat, setRenameDialogChat] = useState<ChatRow | null>(
    null,
  );
  const [deleteDialogChat, setDeleteDialogChat] = useState<ChatRow | null>(
    null,
  );

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

  const openRenameDialog = (chat: ChatRow) => {
    beginRename(chat);
    setRenameDialogChat(chat);
    setMenuOpen(false);
    setDialogOpen(true);
  };

  const closeRenameDialog = () => {
    cancelRename();
    setRenameDialogChat(null);
    setDialogOpen(false);
  };

  const confirmRename = async () => {
    if (!renameDialogChat) return;
    const targetId = renameDialogChat.id;
    setMenuOpen(false);
    setDialogOpen(false);
    setRenameDialogChat(null);
    setPendingChatId(targetId);
    try {
      await submitRename(targetId);
    } finally {
      cancelRename();
      setPendingChatId((current) => (current === targetId ? null : current));
    }
  };

  const openDeleteDialog = (chat: ChatRow) => {
    setDeleteDialogChat(chat);
    setMenuOpen(false);
    setDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogChat(null);
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteDialogChat) return;
    const targetId = deleteDialogChat.id;
    setMenuOpen(false);
    setDialogOpen(false);
    setDeleteDialogChat(null);
    setPendingChatId(targetId);
    try {
      await deleteChat(targetId);
    } finally {
      setPendingChatId((current) => (current === targetId ? null : current));
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span
          className={cn(
            "flex w-full items-center gap-2 justify-center",
            forceExpanded && "justify-start",
            !forceExpanded && "group-hover:justify-start",
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          <span
            className={cn(
              "hidden group-hover:inline",
              forceExpanded && "inline",
            )}
          >
            Chats
          </span>
        </span>
        <div
          className={cn(
            "hidden",
            forceExpanded ? "block" : "group-hover:block",
          )}
        >
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
        <div
          className={cn(
            "flex h-full flex-col overflow-hidden transition-opacity duration-200 ease-out",
            forceExpanded
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
            !forceExpanded &&
              "group-hover:opacity-100 group-hover:pointer-events-auto",
          )}
        >
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
                switchChat={switchChat}
                sending={sending}
                onRename={openRenameDialog}
                onDelete={openDeleteDialog}
                onMenuOpenChange={setMenuOpen}
                expanded={forceExpanded}
                pending={pendingChatId === chat.id}
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

      <Dialog
        open={renameDialogChat !== null}
        onOpenChange={(open) => {
          if (!open) closeRenameDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Update the name for &ldquo;{renameDialogChat?.title ?? ""}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Chat name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeRenameDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRename}
              disabled={!renameValue.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogChat !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteDialogChat?.title ?? ""}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateChatNavButton({
  onClick,
  disabled,
  expanded,
}: {
  onClick: () => void;
  disabled: boolean;
  expanded: boolean;
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
      className={cn(
        "relative flex w-full items-center gap-3 py-2 px-0 transition-all duration-200 text-black hover:bg-muted",
        expanded
          ? "px-3 justify-start"
          : "justify-center group-hover:px-3 group-hover:justify-start",
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
      )}
    >
      <span className="absolute left-0 top-0 h-full w-0.5 bg-transparent" />
      <span className="flex h-6 w-6 items-center justify-center">
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "hidden group-hover:inline truncate",
          expanded && "inline",
        )}
      >
        New Chat
      </span>
    </a>
  );
}

function ChatListItem({
  chat,
  active,
  switchChat,
  sending,
  onRename,
  onDelete,
  onMenuOpenChange,
  expanded,
  pending,
}: {
  chat: ChatRow;
  active: boolean;
  switchChat: (chatId: string) => void;
  sending: boolean;
  onRename: (chat: ChatRow) => void;
  onDelete: (chat: ChatRow) => void;
  onMenuOpenChange: (open: boolean) => void;
  expanded: boolean;
  pending: boolean;
}) {
  const disabled = pending;

  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors",
        active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted",
        disabled && "opacity-70 pointer-events-none",
      )}
      onClick={() => !sending && !pending && switchChat(chat.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{chat.title}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(chat.created_at).toLocaleDateString()}
          </div>
        </div>
        <div
          className={cn(
            "opacity-0 transition-opacity pointer-events-none",
            expanded || pending
              ? "opacity-100 pointer-events-auto"
              : "group-hover:opacity-100 group-hover:pointer-events-auto",
          )}
        >
          {pending ? (
            <div className="flex h-7 w-7 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DropdownMenu onOpenChange={(open) => onMenuOpenChange(open)}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer pointer-events-auto"
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                  }}
                  aria-label="Chat actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="cursor-pointer">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(event) => {
                    event.stopPropagation();
                    onRename(chat);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  variant="destructive"
                  onSelect={(event) => {
                    event.stopPropagation();
                    onDelete(chat);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
