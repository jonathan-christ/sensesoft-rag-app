export function sanitizeFileName(name: string): string {
  if (!name) {
    return "file";
  }

  const normalized = name.normalize("NFKD");
  const lastDotIndex = normalized.lastIndexOf(".");

  const base =
    lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized;
  const extension =
    lastDotIndex > 0 ? normalized.slice(lastDotIndex + 1) : "";

  const sanitizeSegment = (segment: string): string =>
    segment
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "");

  const safeBase = sanitizeSegment(base) || "file";
  const safeExtension = sanitizeSegment(extension);

  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}
