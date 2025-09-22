import { createClient } from "../../../features/auth/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: chats, error } = await supabase
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error in GET /api/chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = (await req.json()) as { title?: string };

    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: title || null })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
