import { useEffect, useState } from "react";
import { getInquiries } from "../services/inquiryService";
import type { inquiry } from "../types/inquiry";

export function useInquiries() {
  const [inquiries, setInquiries] = useState<inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInquiries();
  }, []);

  async function loadInquiries() {
    setLoading(true);

    try {
      const data = await getInquiries();
      setInquiries(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    inquiries,
    loading,
    refresh: loadInquiries,
  };
}