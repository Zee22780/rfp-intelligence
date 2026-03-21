export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceMatch[];
  confidence?: "high" | "medium" | "low";
}

export interface SourceMatch {
  filename: string;
  locator: string;
  similarity_score: number;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  sources: SourceMatch[];
  confidence_level: "high" | "medium" | "low";
  synthesized_response: string;
}

export type DocumentType =
  | "RFP Document"
  | "Case Study"
  | "Pitch Deck"
  | "Client Presentation";

export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  document_type: DocumentType;
  status: string;
  date_uploaded: string;
}

export interface DocumentListResponse {
  document_list: DocumentItem[];
}

export enum NavigationItem {
  Chat = "Current AI Chat",
  // Video = "AI Video",
  // Image = "AI Image",
  Documents = "Document Library",
  // Community = "Community",
  // History = "History",
  Help = "Help",
}

export interface RecentSearch {
  id: string;
  title: string;
  timestamp: string;
}

export interface SearchHistoryItem {
  id: string;
  query_text: string;
  created_at: string; // ISO 8601
}

export interface SearchHistoryResponse {
  items: SearchHistoryItem[];
}
