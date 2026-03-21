import { SearchResponse, DocumentListResponse, DocumentItem, DocumentType, SearchHistoryResponse } from "../types/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function searchRFP(query: string, topK: number = 3): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  return res.json();
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const res = await fetch(`${API_BASE}/api/documents`);

  if (!res.ok) {
    throw new Error(`Failed to fetch documents: ${res.status}`);
  }

  return res.json();
}

export async function getDocument(id: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch document: ${res.status}`);
  }

  return res.json();
}

export async function uploadDocument(file: File, documentType: DocumentType): Promise<{ message: string; document: DocumentItem }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status}`);
  }

  return res.json();
}

export async function getSearchHistory(limit: number = 10): Promise<SearchHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/search-history?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch search history: ${res.status}`);
  return res.json();
}

export async function login(username: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid credentials");
  }

  return res.json();
}
