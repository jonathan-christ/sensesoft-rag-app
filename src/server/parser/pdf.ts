import pdf from "pdf-parse";

export async function parsePdf(fileContent: Buffer): Promise<string> {
  const data = await pdf(fileContent);
  return data.text;
}
