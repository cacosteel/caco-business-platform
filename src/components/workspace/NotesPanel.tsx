import { useState } from "react";

type Props = {
  notes?: string;
  onSave?: (notes: string) => void;
};

export default function NotesPanel({
  notes = "",
  onSave,
}: Props) {
  const [value, setValue] = useState(notes);

  return (
    <div className="bg-white rounded-lg shadow p-5">

      <h2 className="text-lg font-semibold mb-4">
        Internal Notes
      </h2>

      <textarea
        rows={8}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border rounded-lg p-3"
        placeholder="Write notes..."
      />

      <div className="mt-4">

        <button
          onClick={() => onSave?.(value)}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg"
        >
          Save Notes
        </button>

      </div>

    </div>
  );
}