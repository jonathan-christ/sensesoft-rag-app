import { redirect } from "next/navigation";

import { createClient } from "@/features/auth/lib/supabase/server";
import { ChatAppClient } from "../_components/ChatAppClient";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to load chat", error);
    redirect("/chats");
  }

  if (!data) {
    redirect("/chats");
  }

  return <ChatAppClient />;
}
