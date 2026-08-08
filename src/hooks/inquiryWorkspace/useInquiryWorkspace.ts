import { useEffect, useState } from "react";
import { getInquiryWorkspace } from "../../services/inquiryWorkspace/inquiryWorkspaceService";

export function useInquiryWorkspace(id?: string) {

  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<any>(null);

  async function load() {

    if (!id) return;

    const data =
      await getInquiryWorkspace(id);

    setInquiry(data);

    setLoading(false);

  }

  useEffect(() => {
    load();
  }, [id]);

  return {
    loading,
    inquiry,
    refresh: load,
  };

}