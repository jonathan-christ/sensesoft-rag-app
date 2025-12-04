import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import { unauthorized, internalError, badRequest } from "@/server/responses";
import { transcribeAudio } from "@/server/transcription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { supabase } = auth;

  try {
    const { id: chatId } = await params;
    const { content: initialContent, audioUrl } = (await req.json()) as {
      content?: string;
      audioUrl?: string;
    };

    let content = initialContent;

    if (audioUrl) {
      content = await transcribeAudio(audioUrl);
    }

    if (!content) {
      return badRequest("Message content is required");
    }

    // Insert the new message
    const { data: newMessage, error: messageError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, content, role: "user", audio_url: audioUrl })
      .select("*")
      .single();

    if (messageError) {
      return internalError(
        "POST /api/chats/[id]/messages (insert)",
        messageError,
      );
    }

    // Update the chat's updated_at timestamp
    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    if (chatUpdateError) {
      // This error is not critical enough to fail the message insertion, but should be logged.
      console.error("Error updating chat timestamp:", chatUpdateError);
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return internalError("POST /api/chats/[id]/messages", error);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { supabase } = auth;

  try {
    const { id: chatId } = await params;

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return internalError(
        "GET /api/chats/[id]/messages (fetch)",
        messagesError,
      );
    }

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return internalError("GET /api/chats/[id]/messages", error);
  }
}
