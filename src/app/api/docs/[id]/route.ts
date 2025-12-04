import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/server/auth";
import {
  unauthorized,
  internalError,
  notFound,
  badRequest,
} from "@/server/responses";
import { DOCUMENTS_BUCKET } from "@/server/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;

  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, status, created_at, meta")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError) {
      return internalError("GET /api/docs/[id] (document)", documentError);
    }

    if (!document) {
      return notFound("Document not found");
    }

    const { count: chunkCount, error: chunkCountError } = await supabase
      .from("chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (chunkCountError) {
      return internalError("GET /api/docs/[id] (chunks)", chunkCountError);
    }

    // Fetch progress info from document_jobs
    const { data: jobData, error: jobError } = await supabase
      .from("document_jobs")
      .select("total_chunks, processed_chunks, error")
      .eq("document_id", documentId)
      .single();

    return NextResponse.json({
      ...document,
      chunk_count: chunkCount,
      total_chunks: jobData?.total_chunks ?? null,
      processed_chunks: jobData?.processed_chunks ?? null,
      error_reason: jobData?.error ?? null,
    });
  } catch (error) {
    return internalError("GET /api/docs/[id]", error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;

  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    // Fetch storage_path from document_jobs
    const { data: documentJob, error: documentJobError } = await supabase
      .from("document_jobs")
      .select("storage_path")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentJobError) {
      return internalError(
        "DELETE /api/docs/[id] (fetch job)",
        documentJobError,
      );
    }

    if (!documentJob) {
      return notFound("Document job not found");
    }

    // Delete file from Supabase storage
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([documentJob.storage_path]);

    if (storageError) {
      return internalError("DELETE /api/docs/[id] (storage)", storageError);
    }

    // Delete associated chunks
    const { error: chunksError } = await supabase
      .from("chunks")
      .delete()
      .eq("document_id", documentId);

    if (chunksError) {
      return internalError("DELETE /api/docs/[id] (chunks)", chunksError);
    }

    // Delete document jobs records
    const { error: documentJobsError } = await supabase
      .from("document_jobs")
      .delete()
      .eq("document_id", documentId);

    if (documentJobsError) {
      return internalError("DELETE /api/docs/[id] (jobs)", documentJobsError);
    }

    // Delete document record
    const { error: documentError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (documentError) {
      return internalError("DELETE /api/docs/[id] (document)", documentError);
    }

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    return internalError("DELETE /api/docs/[id]", error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;

  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return unauthorized();
  }
  const { user, supabase } = auth;

  try {
    const { filename } = await req.json();

    if (!filename) {
      return badRequest("Filename is required");
    }

    // Update filename in documents table
    const { error: documentUpdateError } = await supabase
      .from("documents")
      .update({ filename })
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (documentUpdateError) {
      return internalError(
        "PATCH /api/docs/[id] (document)",
        documentUpdateError,
      );
    }

    // Update filename in document_jobs table
    const { error: documentJobUpdateError } = await supabase
      .from("document_jobs")
      .update({ filename })
      .eq("document_id", documentId)
      .eq("user_id", user.id);

    if (documentJobUpdateError) {
      return internalError(
        "PATCH /api/docs/[id] (job)",
        documentJobUpdateError,
      );
    }

    return NextResponse.json({ message: "Document name updated successfully" });
  } catch (error) {
    return internalError("PATCH /api/docs/[id]", error);
  }
}
