import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/features/auth/lib/supabase/server";

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chats");
  }

  return <>{children}</>;
}
