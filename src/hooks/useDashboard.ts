import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/dashboard/dashboardService";

export function useDashboard() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    companies: 0,
    inquiries: 0,
    quotations: 0,
    orders: 0,
  });

  useEffect(() => {
    async function load() {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    }

    load();
  }, []);

  return {
    loading,
    stats,
  };
}