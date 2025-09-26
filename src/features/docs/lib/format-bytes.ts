export function formatBytes(bytes: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "--";
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}
