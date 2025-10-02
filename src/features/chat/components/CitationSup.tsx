"use client";

import { Citation } from "@/features/chat/components/CitationsPanel";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/features/shared/components/ui/tooltip";
import { cn } from "@/features/shared/lib/utils";

interface CitationSupProps {
  index: number;
  citation?: Citation;
  onActivate?: (index: number) => void;
  className?: string;
}

export function CitationSup({
  index,
  citation,
  onActivate,
  className,
}: CitationSupProps) {
  const safeIndex = index > 0 ? index : 0;
  const label = safeIndex > 0 ? `[${safeIndex}]` : "[?]";
  const handleClick = () => {
    if (safeIndex > 0) {
      onActivate?.(safeIndex);
    }
  };

  const similarityLabel =
    typeof citation?.similarity === "number"
      ? `${Math.round(citation.similarity * 100)}% relevance`
      : undefined;
  const filename = citation?.filename;
  const fallbackName = citation?.documentId
    ? citation.documentId
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "ml-1 align-super text-[0.65rem] leading-none font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
            className,
          )}
        >
          <sup className="tracking-tight">{label}</sup>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1 text-left">
        <p className="font-semibold text-xs text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground break-words">
          {filename || fallbackName || "Referenced document"}
        </p>
        {similarityLabel && (
          <p className="text-[0.7rem] text-muted-foreground/80">
            {similarityLabel}
          </p>
        )}
        {citation?.content && (
          <p className="text-[0.7rem] text-muted-foreground/80 whitespace-pre-line max-h-32 overflow-hidden">
            {citation.content}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
