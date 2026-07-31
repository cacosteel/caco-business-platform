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
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 10px rgba(0,0,0,.08)",
        minWidth: 180,
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: 14,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: "#0B1F3A",
        }}
      >
        {value}
      </div>
    </div>
  );
}