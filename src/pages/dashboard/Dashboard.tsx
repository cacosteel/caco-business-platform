import { useCompanies } from "../../hooks/useCompanies";
import { useContacts } from "../../hooks/useContacts";
import { useProducts } from "../../hooks/useProducts";

import StatCard from "../../components/dashboard/StatCard";

export default function DashboardHome() {
  const { companies } = useCompanies();
  const { contacts } = useContacts();
  const { products } = useProducts();

  return (
    <div>
      <h1
        style={{
          marginBottom: "20px",
          color: "var(--caco-text-strong)",
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        <StatCard title="Companies" value={companies.length} />
        <StatCard title="Contacts" value={contacts.length} />
        <StatCard title="Products" value={products.length} />
      </div>

      <div
        style={{
          marginTop: "24px",
          background: "var(--caco-surface)",
          border: "1px solid var(--caco-border)",
          borderRadius: "12px",
          padding: "18px",
          boxShadow: "0 2px 8px rgba(62,82,95,0.04)",
        }}
      >
        <h2>Recent Activity</h2>

        <p style={{ color: "var(--caco-muted)" }}>
          No recent activity.
        </p>
      </div>
    </div>
  );
}
