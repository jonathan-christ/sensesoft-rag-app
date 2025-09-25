"use client";

import { createClient } from "@/features/auth/lib/supabase/client";
import { Button } from "@/features/shared/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Button
      onClick={logout}
      className="bg-[#ffb81c] text-white hover:bg-[#ffb81c]/90 font-medium"
    >
      Logout
    </Button>
  );
}
