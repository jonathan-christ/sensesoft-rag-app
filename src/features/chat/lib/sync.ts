import type { Message } from "@/lib/types";

export async function syncLatestAssistantMessage(
  chatId: string,
): Promise<Message | null> {
  if (!chatId) {
    return null;
  }

  try {
    const response = await fetch(`/api/chats/${chatId}/messages`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to sync assistant message:", response.status);
      return null;
    }

    const messages = (await response.json()) as Message[];
    const lastAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant");

    return lastAssistant ?? null;
  } catch (error) {
    console.error("Error syncing assistant message:", error);
    return null;
  }
}
