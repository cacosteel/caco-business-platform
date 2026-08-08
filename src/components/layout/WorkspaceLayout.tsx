import type { ReactNode } from "react";

type Props = {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
};

export default function WorkspaceLayout({
  header,
  sidebar,
  children,
}: Props) {
  return (
    <div className="p-6">

      {header}

      <div className="grid grid-cols-12 gap-6 mt-6">

        <div className="col-span-9">
          {children}
        </div>

        <div className="col-span-3">
          {sidebar}
        </div>

      </div>

    </div>
  );
}
