"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, FileText } from "lucide-react";
import { AuthSection } from "./auth-section";
import { LinkItem } from "./link-item";
import { createClient } from "@/features/auth/lib/supabase/client";

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
      (_event, session) => {
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
      href: "/chats",
      label: "Chats",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      href: "/docs",
      label: "Documents",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const inScope = navItems.some((item) => isActive(item.href));

  if (!inScope) return <>{children}</>;

  return (
    <div className="flex h-screen">
      <aside className="group flex flex-col bg-card border-r border-border w-14 hover:w-52 transition-all duration-200 overflow-hidden">
        <div className="p-3 flex items-center justify-center h-12">
          {/* Small logo (default) */}
          <div className="block group-hover:hidden">
            <Image
              src="/akkodis_logo_small.svg"
              alt="Akkodis"
              width={24}
              height={24}
              priority
            />
          </div>
          {/* Large logo (on hover/expanded) */}
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
        <nav className="flex-1 space-y-1 pt-1">
          {navItems.map((item) => (
            <LinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </nav>
        <SidebarDivider />
        <AuthSection
          email={authEmail}
          loading={authLoading}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function SidebarDivider() {
  return <div className="mx-2 my-2 h-px bg-border" />;
}
