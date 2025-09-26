export type DocumentRow = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};
