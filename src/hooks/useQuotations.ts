import { useEffect, useState } from "react";
import { getQuotations } from "../services/quotationService";
import type { quotation } from "../types/quotation";

export function useQuotations() {
  const [quotations, setQuotations] = useState<quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotations();
  }, []);

  async function loadQuotations() {
    setLoading(true);

    try {
      const data = await getQuotations();
      setQuotations(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    quotations,
    loading,
    refresh: loadQuotations,
  };
}