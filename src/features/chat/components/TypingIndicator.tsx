"use client";

import { cn } from "@/features/shared/lib/utils";

export function TypingIndicator({
  className,
  dotClassName,
}: {
  className?: string;
  dotClassName?: string;
}) {
  const dots = [0, 1, 2];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {dots.map((_, index) => (
        <span
          key={index}
          className={cn("block size-2 rounded-full bg-primary", dotClassName)}
          style={{
            animation: "typing-bounce 0.9s infinite ease-in-out",
            animationDelay: `${index * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
