import type { ReactNode } from "react";

type Props = {
  title: string;
  value: ReactNode;
};

export default function InfoCard({
  title,
  value,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">

      <div className="text-sm text-gray-500 mb-1">
        {title}
      </div>

      <div className="text-lg font-semibold">
        {value}
      </div>

    </div>
  );
}
