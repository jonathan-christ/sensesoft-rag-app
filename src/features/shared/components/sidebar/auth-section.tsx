import { LogIn, LogOut, UserPlus, User } from "lucide-react";
import Link from "next/link";

export function AuthSection(props: {
  email: string | null;
  loading: boolean;
  onLogout: () => Promise<void>;
}) {
  const { email, loading, onLogout } = props;

  if (loading) {
    return (
      <div className="px-2 pb-2">
        <div className="h-6 w-10 rounded bg-muted transition-all group-hover:w-28" />
      </div>
    );
  }

  if (email) {
    return (
      <div className="px-2 pb-2">
        <div className="group flex items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center">
            <User className="h-4 w-4" />
          </span>
          <span className="flex-1 truncate" title={email}>
            {email}
          </span>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="opacity-0 transition-opacity group-hover:opacity-100 text-red-600 hover:text-red-900"
            title="Logout"
          >
            <LogOut className="h-4 w-4 cursor-pointer" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2 space-y-1">
      <Link
        href="/login"
        className="relative flex items-center justify-center gap-3 px-0 py-2 hover:bg-muted rounded group group-hover:justify-start group-hover:px-3"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          <LogIn className="h-4 w-4" />
        </span>
        <span className="hidden whitespace-nowrap group-hover:inline">Login</span>
      </Link>
      <Link
        href="/signup"
        className="relative flex items-center justify-center gap-3 px-0 py-2 hover:bg-muted rounded group group-hover:justify-start group-hover:px-3"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          <UserPlus className="h-4 w-4" />
        </span>
        <span className="hidden whitespace-nowrap group-hover:inline">Sign Up</span>
      </Link>
    </div>
  );
}
