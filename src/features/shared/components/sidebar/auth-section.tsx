import { LogIn, LogOut, UserPlus, User } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { cn } from "@/features/shared/lib/utils";

export function AuthSection(props: {
  email: string | null;
  loading: boolean;
  onLogout: () => Promise<void>;
  expanded?: boolean;
}) {
  const { email, loading, onLogout, expanded = false } = props;

  if (loading) {
    return (
      <div className={cn("p-2", expanded && "px-3")}>
        <div
          className={cn(
            "h-6 bg-muted rounded transition-all",
            expanded ? "w-28" : "w-10 group-hover:w-28",
          )}
        />
      </div>
    );
  }

  if (email) {
    return (
      <div className={cn("pb-2", expanded ? "px-3" : "px-2")}>
        <div
          className={cn(
            "relative flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground",
            expanded
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
          title={email}
        >
          <span className="shrink-0">
            <User className="h-4 w-4" />
          </span>
          <span className="truncate whitespace-nowrap">{email}</span>
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2 text-red-600 hover:text-red-700",
            expanded
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="whitespace-nowrap">Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("pb-2 space-y-1", expanded ? "px-3" : "px-2")}>
      <Link
        href="/login"
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded",
          expanded
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 transition-opacity",
        )}
      >
        <span className="shrink-0">
          <LogIn className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap">Login</span>
      </Link>
      <Link
        href="/signup"
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded",
          expanded
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 transition-opacity",
        )}
      >
        <span className="shrink-0">
          <UserPlus className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap">Sign Up</span>
      </Link>
    </div>
  );
}
