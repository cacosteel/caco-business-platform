import { useEffect, useState } from "react";
import { getOrderWorkspace } from "../services/workspace/orderWorkspaceService";

export function useOrderWorkspace(id?: string) {

  const [loading, setLoading] = useState(true);

  const [order, setOrder] = useState<any>(null);

  useEffect(() => {

    if (!id) return;

    async function load() {

      try {

        const data =
          await getOrderWorkspace(id);

        setOrder(data);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, [id]);

  return {
    loading,
    order,
    refresh: () =>
      getOrderWorkspace(id!),
  };

}