import { redirect } from "next/navigation";

import { createClient } from "@/features/auth/lib/supabase/server";
import { ChatAppClient } from "@/features/chat/components/ChatAppClient";

export default async function ChatsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    redirect(`/chats/${data[0].id}`);
  }

  return <ChatAppClient />;
}
