const documents = [
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "Certificate of Origin",
  "Mill Test Certificate",
  "Insurance Certificate",
  "Inspection Report",
];

export default function DocumentsTable() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Document
            </th>

            <th className="p-3 text-left">
              File
            </th>

            <th className="p-3 text-left">
              Action
            </th>

          </tr>

        </thead>

        <tbody>

          {documents.map((doc) => (

            <tr
              key={doc}
              className="border-t"
            >

              <td className="p-3">
                {doc}
              </td>

              <td className="p-3 text-gray-500">
                -
              </td>

              <td className="p-3">

                <button className="text-orange-500">
                  Upload
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}