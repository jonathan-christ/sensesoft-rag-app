import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth, isAuthError } from "@/server/auth";
import { unauthorized, badRequest, internalError } from "@/server/responses";
import { VOICE_MESSAGES_BUCKET } from "@/server/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { supabase } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("No file provided");
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExtension}`;

    const { data, error } = await supabase.storage
      .from(VOICE_MESSAGES_BUCKET)
      .upload(fileName, file);

    if (error) {
      return internalError("POST /api/audio/upload (upload)", error);
    }

    const { data: publicUrlData } = supabase.storage
      .from(VOICE_MESSAGES_BUCKET)
      .getPublicUrl(data.path);

    if (!publicUrlData) {
      return internalError(
        "POST /api/audio/upload (url)",
        new Error("Failed to get public URL"),
        "Failed to get public URL",
      );
    }

    return NextResponse.json(
      { audioUrl: publicUrlData.publicUrl },
      { status: 200 },
    );
  } catch (error) {
    return internalError("POST /api/audio/upload", error);
  }
}
