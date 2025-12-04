import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import {
  unauthorized,
  internalError,
  badRequest,
  notFound,
} from "@/server/responses";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const { id: chatId } = await params;
    const { title } = (await req.json()) as { title?: string };

    if (!title?.trim()) {
      return badRequest("Title is required");
    }

    const { data: updatedChat, error } = await supabase
      .from("chats")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId)
      .eq("user_id", user.id)
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      return internalError("PUT /api/chats/[id]", error);
    }

    if (!updatedChat) {
      return notFound("Chat not found");
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    return internalError("PUT /api/chats/[id]", error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const { id: chatId } = await params;

    // Delete all messages in the chat first (due to foreign key constraints)
    const { error: messagesError } = await supabase
      .from("messages")
      .delete()
      .eq("chat_id", chatId);

    if (messagesError) {
      return internalError("DELETE /api/chats/[id] (messages)", messagesError);
    }

    // Delete the chat
    const { error: chatError } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (chatError) {
      return internalError("DELETE /api/chats/[id] (chat)", chatError);
    }

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    return internalError("DELETE /api/chats/[id]", error);
  }
}
