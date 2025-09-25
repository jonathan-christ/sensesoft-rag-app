import pdf from "pdf-parse/lib/pdf-parse.js";

export async function parsePdf(fileContent: Buffer): Promise<string> {
  const data = await pdf(fileContent);
  return data.text;
}
