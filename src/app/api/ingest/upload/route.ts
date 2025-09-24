import { createClient } from "@/features/auth/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const jobIds: string[] = [];

    for (const file of files) {
      const uniqueFileName = `${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents") // Assuming a 'documents' bucket exists
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        // Continue to next file, but log the error
        continue;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(`Error getting user for file ${file.name}:`, userError);
        continue;
      }

      const jobId = crypto.randomUUID(); // Generate a job ID for each file

      // Insert document metadata into the database
      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        status: "uploaded",
        meta: {
          storage_path: uploadData.path,
          job_id: jobId,
        },
      });

      if (insertError) {
        console.error(
          `Error inserting document metadata for ${file.name}:`,
          insertError,
        );
        // Continue to next file, but log the error
        continue;
      }

      jobIds.push(jobId);
    }

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: "No files were successfully processed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ jobIds }, { status: 200 });
  } catch (error) {
    console.error("Unhandled error during file upload:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
