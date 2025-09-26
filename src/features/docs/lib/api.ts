export async function fetchDocuments(limit: number = 50) {
  const response = await fetch(`/api/docs?limit=${limit}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load documents (${response.status})`);
  }
  return response.json();
}

export async function uploadDocuments(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/ingest", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to upload documents");
  }

  return response.json().catch(() => ({}));
}
