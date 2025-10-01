import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/features/auth/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, filename, mime_type, size_bytes, status, created_at, meta")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError) {
      console.error("Error fetching document:", documentError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const { count: chunkCount, error: chunkCountError } = await supabase
      .from("chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (chunkCountError) {
      console.error("Error fetching chunk count:", chunkCountError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...document,
      chunk_count: chunkCount,
    });
  } catch (error) {
    console.error("Error in GET /api/docs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    // Fetch storage_path from document_jobs
    const { data: documentJob, error: documentJobError } = await supabase
      .from("document_jobs")
      .select("storage_path")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentJobError) {
      console.error("Error fetching document job:", documentJobError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    if (!documentJob) {
      return NextResponse.json(
        { error: "Document job not found" },
        { status: 404 },
      );
    }

    // Delete file from Supabase storage
    const { error: storageError } = await supabase.storage
      .from("documents") // Assuming the bucket name is "documents"
      .remove([documentJob.storage_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Delete associated chunks
    const { error: chunksError } = await supabase
      .from("chunks")
      .delete()
      .eq("document_id", documentId);

    if (chunksError) {
      console.error("Error deleting chunks:", chunksError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Delete document jobs records
    const { error: documentJobsError } = await supabase
      .from("document_jobs")
      .delete()
      .eq("document_id", documentId);

    if (documentJobsError) {
      console.error("Error deleting document jobs:", documentJobsError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Delete document record
    const { error: documentError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (documentError) {
      console.error("Error deleting document:", documentError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/docs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 },
      );
    }

    // Update filename in documents table
    const { error: documentUpdateError } = await supabase
      .from("documents")
      .update({ filename })
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (documentUpdateError) {
      console.error("Error updating document filename:", documentUpdateError);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    // Update filename in document_jobs table
    const { error: documentJobUpdateError } = await supabase
      .from("document_jobs")
      .update({ filename })
      .eq("document_id", documentId)
      .eq("user_id", user.id);

    if (documentJobUpdateError) {
      console.error(
        "Error updating document job filename:",
        documentJobUpdateError,
      );
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Document name updated successfully" });
  } catch (error) {
    console.error("Error in PATCH /api/docs/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
