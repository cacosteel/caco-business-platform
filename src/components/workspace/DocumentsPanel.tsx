const docs = [
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "Certificate of Origin",
  "Mill Test Certificate",
  "Insurance",
  "Inspection Report",
];

export default function DocumentsPanel() {
  return (
    <div className="space-y-3">

      {docs.map((doc) => (

        <div
          key={doc}
          className="flex justify-between items-center border rounded-lg p-3"
        >

          <span>{doc}</span>

          <button className="text-cyan-700">
            Upload
          </button>

        </div>

      ))}

    </div>
  );
}
