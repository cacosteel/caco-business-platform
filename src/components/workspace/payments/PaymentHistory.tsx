export default function PaymentHistory() {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Date
            </th>

            <th className="p-3 text-left">
              Description
            </th>

            <th className="p-3 text-right">
              Amount
            </th>

            <th className="p-3 text-left">
              Status
            </th>

          </tr>

        </thead>

        <tbody>

          <tr>

            <td
              colSpan={4}
              className="p-6 text-center text-gray-500"
            >
              No payment records
            </td>

          </tr>

        </tbody>

      </table>

    </div>

  );

}