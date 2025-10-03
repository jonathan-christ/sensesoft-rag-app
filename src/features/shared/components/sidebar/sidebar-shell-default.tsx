"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { SidebarLinkAction } from "./sidebar-shell-links";
import { SidebarDivider } from "./sidebar-shell-shared";
import { AuthSection } from "./auth-section";

interface DefaultSidebarProps {
  navItems: { href: string; label: string; icon: ReactNode }[];
  authEmail: string | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  pathname: string;
  children: ReactNode;
}

export function DefaultSidebar({
  navItems,
  authEmail,
  authLoading,
  onLogout,
  pathname,
  children,
}: DefaultSidebarProps) {
  return (
    <div className="flex h-screen">
      <aside className="group flex w-14 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 hover:w-56">
        <LogoBlock />
        <nav className="space-y-1 pt-1">
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
        </nav>
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
