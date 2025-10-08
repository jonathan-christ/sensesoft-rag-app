import { AssemblyAI } from "assemblyai";

const apiKey = process.env.ASSEMBLYAI_API_KEY;
if (!apiKey) {
  throw new Error(
    "ASSEMBLYAI_API_KEY is not set in the environment variables.",
  );
}

const client = new AssemblyAI({
  apiKey,
});

export async function transcribeAudio(audioUrl: string): Promise<string> {
  console.log(`Transcription requested for: ${audioUrl}`);

  try {
    const transcript = await client.transcripts.create({
      audio_url: audioUrl,
    });

    if (transcript.status === "error") {
      console.error("Transcription failed:", transcript.error);
      throw new Error("Transcription failed");
    }

    if (!transcript.text) {
      console.warn("Transcription returned no text.");
      return "";
    }

    console.log(`Transcription result: ${transcript.text}`);
    return transcript.text;
  } catch (error) {
    console.error("Error calling AssemblyAI:", error);
    throw new Error("Failed to transcribe audio");
  }
}
