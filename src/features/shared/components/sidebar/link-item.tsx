import Link from "next/link";
import { cn } from "@/features/shared/lib/utils";

export function LinkItem({
  href,
  label,
  icon,
  active,
  expanded = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  expanded?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 py-2 px-0 justify-center transition-all duration-200 text-black hover:bg-muted group-hover:px-3 group-hover:justify-start",
        active && "bg-muted",
        expanded && "px-3 justify-start",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-0.5 transition-colors",
          active ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span
        className={cn(
          "hidden group-hover:inline whitespace-nowrap",
          expanded && "inline",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
