import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import { unauthorized, internalError } from "@/server/responses";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    // Fetch documents with their job progress info
    const {
      data: documents,
      error: documentsError,
      count,
    } = await supabase
      .from("documents")
      .select(
        "id, filename, mime_type, size_bytes, status, created_at, meta",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (documentsError) {
      return internalError("GET /api/docs (documents)", documentsError);
    }

    // Fetch progress info from document_jobs for pending/processing documents
    const docIds = documents?.map((d) => d.id) ?? [];
    let jobProgressMap: Record<
      string,
      { total_chunks: number; processed_chunks: number; error: string | null }
    > = {};

    if (docIds.length > 0) {
      const { data: jobs, error: jobsError } = await supabase
        .from("document_jobs")
        .select("document_id, total_chunks, processed_chunks, error")
        .in("document_id", docIds);

      if (!jobsError && jobs) {
        jobProgressMap = jobs.reduce(
          (acc, job) => {
            acc[job.document_id] = {
              total_chunks: job.total_chunks,
              processed_chunks: job.processed_chunks,
              error: job.error,
            };
            return acc;
          },
          {} as typeof jobProgressMap,
        );
      }
    }

    // Enrich documents with progress info
    const enrichedDocuments = documents?.map((doc) => {
      const progress = jobProgressMap[doc.id];
      return {
        ...doc,
        total_chunks: progress?.total_chunks ?? null,
        processed_chunks: progress?.processed_chunks ?? null,
        error_reason: progress?.error ?? null,
      };
    });

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      documents: enrichedDocuments,
      page,
      limit,
      totalPages,
      totalDocuments: count,
    });
  } catch (error) {
    return internalError("GET /api/docs", error);
  }
}
