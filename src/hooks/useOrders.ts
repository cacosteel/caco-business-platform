import { useEffect, useState } from "react";
import { getOrders } from "../services/orderService";
import type { order } from "../types/order";

export function useOrders() {
  const [orders, setOrders] = useState<order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);

    try {
      const data = await getOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    orders,
    loading,
    refresh: loadOrders,
  };
}