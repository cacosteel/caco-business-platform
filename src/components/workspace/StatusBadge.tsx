type StatusBadgeProps = {
  status?: string;
};

const colors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",

  sent: "bg-blue-100 text-blue-700",

  approved: "bg-green-100 text-green-700",

  rejected: "bg-red-100 text-red-700",

  expired: "bg-red-100 text-red-700",

  confirmed: "bg-cyan-100 text-cyan-700",

  production: "bg-indigo-100 text-indigo-700",

  packed: "bg-purple-100 text-purple-700",

  shipped: "bg-sky-100 text-sky-700",

  completed: "bg-emerald-100 text-emerald-700",

  cancelled: "bg-red-100 text-red-700",
};

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const cls =
    colors[status ?? ""] ??
    "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}
    >
      {status ?? "-"}
    </span>
  );
}
