import { LogIn, LogOut, UserPlus, User } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

export function AuthSection(props: {
  email: string | null;
  loading: boolean;
  onLogout: () => Promise<void>;
}) {
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
          <span className="shrink-0">
            <User className="h-4 w-4" />
          </span>
          <span
            className="truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
            title={email}
          >
            {email}
          </span>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2 text-red-600 hover:text-red-700"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Logout
          </span>
        </Button>
      </div>
    );
  }
  return (
    <div className="px-2 pb-2 space-y-1">
      <Link
        href="/login"
        className="relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded"
      >
        <span className="shrink-0">
          <LogIn className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Login
        </span>
      </Link>
      <Link
        href="/signup"
        className="relative flex items-center gap-3 px-3 py-2 hover:bg-muted rounded"
      >
        <span className="shrink-0">
          <UserPlus className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Sign Up
        </span>
      </Link>
    </div>
  );
}
