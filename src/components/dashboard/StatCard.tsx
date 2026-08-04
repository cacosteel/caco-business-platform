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
        borderRadius: 10,
        padding: 16,
        boxShadow: "0 2px 10px rgba(0,0,0,.08)",
        minWidth: 150,
      }}
    >
      <div
        style={{
          color: "#666",
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
          color: "#252A31",
        }}
      >
        {value}
      </div>
    </div>
  );
}
