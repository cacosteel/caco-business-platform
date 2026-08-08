import clsx from "clsx";

type Props = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export default function WorkspaceTabs({
  tabs,
  active,
  onChange,
}: Props) {
  return (
    <div className="border-b mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max">

        {tabs.map((tab) => (

          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={clsx(
              "px-4 py-3 text-sm font-medium border-b-2 transition",
              active === tab
                ? "border-cyan-500 text-cyan-700"
                : "border-transparent text-gray-500 hover:text-black"
            )}
          >
            {tab}
          </button>

        ))}

      </div>
    </div>
  );
}
