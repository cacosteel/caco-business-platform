interface StatCardProps {
  title: string;
  value: number;
}

export default function StatCard({
  title,
  value,
}: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--caco-surface)",
        border: "1px solid var(--caco-border)",
        borderRadius: 10,
        padding: 16,
        boxShadow: "0 2px 8px rgba(62,82,95,0.04)",
        minWidth: 150,
      }}
    >
      <div
        style={{
          color: "var(--caco-muted)",
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 27,
          fontWeight: 700,
          color: "var(--caco-text-strong)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
