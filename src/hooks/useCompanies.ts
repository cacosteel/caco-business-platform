import { useEffect, useState } from "react";
import { getCompanies } from "../services/companyService";
import type { company } from "../types/company";

export function useCompanies() {
  const [companies, setCompanies] = useState<company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);

    try {
      const data = await getCompanies();
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    companies,
    loading,
    refresh: loadCompanies,
  };
}