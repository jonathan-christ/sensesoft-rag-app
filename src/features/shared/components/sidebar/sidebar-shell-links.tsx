"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}

interface SidebarButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

export function SidebarLinkAction(
  props: SidebarLinkProps | SidebarButtonProps,
) {
  if (isLinkProps(props)) {
    const { href, label, icon, active } = props;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative rounded-md !cursor-pointer flex w-full items-center gap-3 px-0 py-1 transition-all duration-200 group-hover:justify-start group-hover:px-3 justify-center border-0 ${active ? "border-1 border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted"}`}
      >
        <span className="absolute left-0 top-0 h-full w-0.5 bg-transparent" />
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
        <span className="hidden whitespace-nowrap group-hover:inline">
          {label}
        </span>
      </Link>
    );
  }

  const { label, icon, onClick, disabled } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center justify-center gap-3 px-0 py-2 text-left transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 group-hover:justify-start group-hover:px-3"
    >
      <span className="absolute left-0 top-0 h-full w-0.5 bg-transparent" />
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="hidden whitespace-nowrap group-hover:inline">
        {label}
      </span>
    </button>
  );
}

function isLinkProps(
  props: SidebarLinkProps | SidebarButtonProps,
): props is SidebarLinkProps {
  return (props as SidebarLinkProps).href !== undefined;
}
