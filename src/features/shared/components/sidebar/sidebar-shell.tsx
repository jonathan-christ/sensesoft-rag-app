"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { FileText } from "lucide-react";

import { createClient } from "@/features/auth/lib/supabase/client";
import { ChatAppProvider } from "@/features/chat/context/ChatContext";
import { ChatSidebar } from "./sidebar-shell-chat";

interface SidebarShellProps {
  children: React.ReactNode;
}

export default function SidebarShell({ children }: SidebarShellProps) {
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

  const baseProps = {
    authEmail,
    authLoading,
    onLogout: async () => {
      await supabase.auth.signOut();
      router.push("/login");
    },
    pathname,
    navItems,
  } as const;

  if (!authLoading && !authEmail) {
    return <>{children}</>;
  }

  return (
    <ChatAppProvider>
      <ChatSidebar {...baseProps}>{children}</ChatSidebar>
    </ChatAppProvider>
  );
}
