import { useEffect, useState } from "react";
import { getOrderItems } from "../services/orderItems/orderItemService";

export function useOrderItems(orderId?: string) {

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {

    if (!orderId) return;

    const data = await getOrderItems(orderId);

    setItems(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [orderId]);

  return {
    items,
    loading,
    refresh: load,
  };
}