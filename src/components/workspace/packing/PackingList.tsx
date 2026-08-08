export default function PackingList() {

  return (

    <div className="bg-white rounded-lg shadow p-5">

      <h2 className="font-semibold mb-4">
        Packing List
      </h2>

      <table className="w-full">

        <thead>

          <tr>

            <th className="text-left p-2">
              Bundle
            </th>

            <th className="text-left p-2">
              Description
            </th>

            <th className="text-right p-2">
              Weight
            </th>

          </tr>

        </thead>

        <tbody>

          <tr>

            <td
              colSpan={3}
              className="text-center p-6 text-gray-500"
            >
              No packing records
            </td>

          </tr>

        </tbody>

      </table>

    </div>

  );

}