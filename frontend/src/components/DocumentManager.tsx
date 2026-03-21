"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DocumentItem, DocumentType } from "../types/types";
import { listDocuments, uploadDocument, deleteDocument } from "../services/api";
import { Upload, Trash2, FileText, Loader2, RefreshCw } from "lucide-react";

const DOCUMENT_TYPES: DocumentType[] = [
  "RFP Document",
  "Case Study",
  "Pitch Deck",
  "Client Presentation",
];

export default function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] =
    useState<DocumentType>("RFP Document");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDocuments();
      setDocuments(res.document_list);
    } catch {
      setError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();

    // Poll every 3 seconds to update status badge for each document
    const interval = setInterval(async () => {
      // console.log("polling...");
      const res = await listDocuments();
      // console.log("docs", res.document_list);
      const docs = res.document_list;
      setDocuments(docs);

      // Stop polling when status is either ready or failed
      const stillProcessing = docs.some(
        (doc) => doc.status === "queued" || doc.status === "processing",
      );
      if (!stillProcessing) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadDocument(file, selectedType);
      await fetchDocuments();
    } catch {
      setError("Failed to upload document.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete document.");
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: "bg-blue-100 text-blue-700",
      processing: "bg-blue-100 text-blue-700",
      queued: "bg-gray-100 text-gray-600",
      failed: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.queued}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 z-10 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
          <button
            onClick={fetchDocuments}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Upload a Document
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Document List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {doc.document_type} &middot;{" "}
                    {new Date(doc.date_uploaded).toLocaleDateString()}
                  </div>
                </div>
                {statusBadge(doc.status)}
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
