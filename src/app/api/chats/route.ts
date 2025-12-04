import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import { unauthorized, internalError, badRequest } from "@/server/responses";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const { data: chats, error } = await supabase
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return internalError("GET /api/chats", error);
    }

    return NextResponse.json(chats);
  } catch (error) {
    return internalError("GET /api/chats", error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const body = await req.json();
    const { title } = body as { title?: string };

    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: title || null })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      return internalError("POST /api/chats", error);
    }

    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    return internalError("POST /api/chats", error);
  }
}
