export default function CompanyOrders({
  orders,
}: any) {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Order
            </th>

            <th className="p-3 text-left">
              Amount
            </th>

            <th className="p-3 text-left">
              Status
            </th>

          </tr>

        </thead>

        <tbody>

          {(orders || []).map((item: any) => (

            <tr
              key={item.id}
              className="border-t"
            >

              <td className="p-3">
                {item.order_no}
              </td>

              <td className="p-3">
                {item.total_amount}
              </td>

              <td className="p-3">
                {item.status}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}