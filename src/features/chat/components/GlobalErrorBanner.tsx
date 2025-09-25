"use client";
import { Button } from "@/features/shared/components/ui/button";

export function GlobalErrorBanner(props: { message: string; onClose: () => void }) {
  const { message, onClose } = props;
  return (
    <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
      <div className="flex items-center gap-2 text-destructive text-sm">
        <span>⚠️</span>
        <span>{message}</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto h-6 w-6 p-0">×</Button>
      </div>
    </div>
  );
}
