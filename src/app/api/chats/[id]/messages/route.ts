import { createClient } from "../../../../../features/auth/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { content } = (await req.json()) as { content?: string };

    if (!content) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    // Insert the new message
    const { data: newMessage, error: messageError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, content, role: "user" })
      .select("*")
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Update the chat's updated_at timestamp
    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    if (chatUpdateError) {
      console.error("Error updating chat timestamp:", chatUpdateError);
      // This error is not critical enough to fail the message insertion, but should be logged.
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chats/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/chats/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
