import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/features/auth/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const {
      data: documents,
      error: documentsError,
      count,
    } = await supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, status, created_at, meta", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (documentsError) {
      console.error("Error fetching documents:", documentsError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      documents,
      page,
      limit,
      totalPages,
      totalDocuments: count,
    });
  } catch (error) {
    console.error("Error in GET /api/docs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
