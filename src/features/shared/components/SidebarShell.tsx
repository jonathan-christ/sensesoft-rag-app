"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, FileText } from "lucide-react";

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
