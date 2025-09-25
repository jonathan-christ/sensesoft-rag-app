// Simple text chunker
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    let chunk = text.substring(i, end);

    // Adjust chunk to end at a natural break (e.g., end of a sentence)
    const lastPeriod = chunk.lastIndexOf(".");
    if (lastPeriod > -1 && lastPeriod > chunkSize * 0.8) {
      // If a period is near the end of the chunk
      chunk = chunk.substring(0, lastPeriod + 1);
    } else {
      // If no good break, try to find a space
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > -1 && lastSpace > chunkSize * 0.8) {
        chunk = chunk.substring(0, lastSpace);
      }
    }

    chunks.push(chunk.trim());
    i += chunkSize - overlap;
    if (i >= text.length) break; // Ensure we don't go past the end
  }
  return chunks.filter((c) => c.length > 0);
}
