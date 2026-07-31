import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function DashboardCard({
  title,
  children,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-5">

      <h2 className="font-semibold mb-4">
        {title}
      </h2>

      {children}

    </div>
  );
}
