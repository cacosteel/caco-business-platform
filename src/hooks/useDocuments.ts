import { useEffect, useState } from "react";
import { getDocuments } from "../services/documentService";
import type { document } from "../types/document";

export function useDocuments() {
  const [documents, setDocuments] = useState<document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);

    try {
      const data = await getDocuments();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    documents,
    loading,
    refresh: loadDocuments,
  };
}