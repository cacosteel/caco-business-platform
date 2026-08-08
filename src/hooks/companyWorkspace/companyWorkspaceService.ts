import { useEffect, useState } from "react";
import { getCompanyWorkspace } from "../../services/companyWorkspace/companyWorkspaceService";

export function useCompanyWorkspace(id?: string) {

  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState<any>(null);

  async function load() {

    if (!id) return;

    const data = await getCompanyWorkspace(id);

    setCompany(data);

    setLoading(false);

  }

  useEffect(() => {
    load();
  }, [id]);

  return {
    loading,
    company,
    refresh: load,
  };

}