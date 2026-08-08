import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function WorkspaceHeader({
  title,
  subtitle,
  actions,
}: Props) {
  return (
    <div className="flex justify-between items-start mb-6">

      <div>

        <h1 className="text-3xl font-bold">
          {title}
        </h1>

        {subtitle && (
          <p className="text-gray-500 mt-1">
            {subtitle}
          </p>
        )}

      </div>

      <div>
        {actions}
      </div>

    </div>
  );
}
