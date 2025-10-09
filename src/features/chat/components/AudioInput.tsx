"use client";
import { useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Mic, Loader2, X } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

interface AudioInputProps {
  onAudioSubmit: (audioUrl: string) => Promise<void>;
  disabled?: boolean;
  sending?: boolean;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function AudioInput({
  onAudioSubmit,
  disabled,
  sending,
}: AudioInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    duration,
    error: recordingError,
  } = useAudioRecorder();

  const uploadAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    const fileName = `audio_${Date.now()}.webm`;
    formData.append("file", audioBlob, fileName);

    const response = await fetch("/api/audio/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload audio");
    }

    const { audioUrl } = await response.json();
    return audioUrl;
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      // Start recording
      setError(null);
      try {
        await startRecording();
      } catch (err) {
        setError("Failed to start recording");
      }
    } else {
      // Stop recording and send
      try {
        setError(null);
        setUploading(true);

        const audioBlob = await stopRecording();
        if (!audioBlob) {
          throw new Error("No audio recorded");
        }

        const audioUrl = await uploadAudio(audioBlob);
        await onAudioSubmit(audioUrl);
      } catch (err) {
        console.error("Error processing audio:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process audio",
        );
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      await stopRecording(); // This will cleanup but we won't use the blob
    }
    setError(null);
  };

  if (!isSupported) {
    return null; // Don't show the component if audio recording isn't supported
  }

  const isProcessing = uploading || sending;
  const showError = error || recordingError;

  if (!isRecording) {
    // Show just the microphone button when not recording
    return (
      <div className="relative">
        <Button
          type="button"
          onClick={handleToggleRecording}
          disabled={disabled || isProcessing}
          variant="outline"
          size="sm"
          className="h-12 px-3"
          title="Record voice message"
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Error tooltip */}
        {showError && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
            {showError}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"></div>
          </div>
        )}
      </div>
    );
  }

  // Show compact recording interface when recording
  return (
    <div className="flex items-center gap-2">
      {/* Recording indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 h-12">
        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        <span className="font-mono text-xs">{formatDuration(duration)}</span>
      </div>

      {/* Cancel button */}
      <Button
        type="button"
        onClick={handleCancel}
        disabled={isProcessing}
        variant="outline"
        size="sm"
        className="h-12 px-3"
        title="Cancel recording"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Toggleable mic button - click to stop and send */}
      <Button
        type="button"
        onClick={handleToggleRecording}
        disabled={isProcessing}
        className="h-12 px-3 bg-green-600 hover:bg-green-700"
        title="Click to stop recording and send"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
