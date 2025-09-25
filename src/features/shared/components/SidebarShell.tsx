"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, MessageSquare, FileText, LogIn, LogOut, UserPlus, User } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { createClient } from "@/features/auth/lib/supabase/client";

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (mounted) setAuthEmail(data.user?.email ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  const inScope = pathname === "/" || pathname.startsWith("/chat") || pathname.startsWith("/docs");

  if (!inScope) return <>{children}</>;

  return (
    <div className="flex h-screen">
      <aside className="group flex flex-col bg-card border-r border-border w-14 hover:w-52 transition-all duration-200 overflow-hidden">
        <div className="p-3 flex items-center justify-center h-12">
          {/* Small logo (default) */}
          <div className="block group-hover:hidden">
            <Image src="/akkodis_logo_small.svg" alt="Akkodis" width={24} height={24} priority />
          </div>
          {/* Large logo (on hover/expanded) */}
          <div className="hidden group-hover:block w-full px-3">
            <Image src="/akkodis_logo.svg" alt="Akkodis" width={160} height={28} priority />
          </div>
        </div>
        <nav className="flex-1 space-y-1 pt-1">
          <SidebarLink href="/" label="Home" icon={<Home className="h-4 w-4" />} active={isActive("/")} />
          <SidebarLink href="/chat" label="Chat" icon={<MessageSquare className="h-4 w-4" />} active={isActive("/chat")} />
          <SidebarLink href="/docs" label="Documents" icon={<FileText className="h-4 w-4" />} active={isActive("/docs")} />
        </nav>
        <SidebarDivider />
        <AuthSection
          email={authEmail}
          loading={authLoading}
          onLogout={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
          }}
        />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function SidebarLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 px-3 py-2 hover:bg-muted ${active ? "bg-muted" : ""}`}
    >
      {/* Active indicator */}
      <span className={`absolute left-0 top-0 h-full w-0.5 ${active ? "bg-primary" : "bg-transparent"}`} />
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
    </Link>
  );
}

function SidebarDivider() {
  return <div className="mx-2 my-2 h-px bg-border" />;
}

function AuthSection(props: { email: string | null; loading: boolean; onLogout: () => Promise<void> }) {
  const { email, loading, onLogout } = props;
  if (loading) {
    return (
      <div className="p-2">
        <div className="h-6 bg-muted rounded w-10 group-hover:w-28 transition-all" />
      </div>
    );
  }
  if (email) {
    return (
      <div className="px-2 pb-2">
        <div className="relative flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
          <span className="shrink-0"><User className="h-4 w-4" /></span>
          <span className="truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" title={email}>{email}</span>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-red-600 hover:text-red-700" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Logout</span>
        </Button>
      </div>
    );
  }
  return (
    <div className="px-2 pb-2 space-y-1">
      <Link href="/login" className="relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded">
        <span className="shrink-0"><LogIn className="h-4 w-4" /></span>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Login</span>
      </Link>
      <Link href="/signup" className="relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded">
        <span className="shrink-0"><UserPlus className="h-4 w-4" /></span>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Sign Up</span>
      </Link>
    </div>
  );
}
