import type { DocumentRow } from "./types";
import { STATUS_ORDER } from "@/features/shared/lib/const";

const STATUS_CLASS_MAP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
  error: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-200",
};

export function getStatusPriority(status: string | null): number {
  const normalized = status ?? "";
  const index = STATUS_ORDER.indexOf(normalized as (typeof STATUS_ORDER)[number]);
  return index === -1 ? STATUS_ORDER.length : index;
}

export function getStatusStyle(status: string | null): string {
  return STATUS_CLASS_MAP[status ?? ""] ?? "bg-muted text-muted-foreground";
}

export function sortDocuments(documents: DocumentRow[]): DocumentRow[] {
  return [...documents].sort((a, b) => {
    const diff = getStatusPriority(a.status) - getStatusPriority(b.status);
    if (diff !== 0) return diff;

    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
}
