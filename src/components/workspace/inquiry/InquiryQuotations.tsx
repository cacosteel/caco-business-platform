export default function InquiryQuotations({
  quotations,
}: any) {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Quotation
            </th>

            <th className="p-3 text-right">
              Amount
            </th>

            <th className="p-3">
              Status
            </th>

          </tr>

        </thead>

        <tbody>

          {(quotations || []).map((q: any) => (

            <tr
              key={q.id}
              className="border-t"
            >

              <td className="p-3">
                {q.quotation_no}
              </td>

              <td className="p-3 text-right">
                {q.total_amount}
              </td>

              <td className="p-3">
                {q.status}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}