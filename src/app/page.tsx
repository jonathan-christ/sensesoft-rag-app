import { redirect } from "next/navigation";

/**
 * Root route redirects to /chats.
 * Using server redirect avoids client-side flash.
 */
export default function Page() {
  redirect("/chats");
}
