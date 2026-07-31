import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function SidebarCard({
  title,
  children,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-5">

      <h3 className="font-semibold mb-4">
        {title}
      </h3>

      {children}

    </div>
  );
}
