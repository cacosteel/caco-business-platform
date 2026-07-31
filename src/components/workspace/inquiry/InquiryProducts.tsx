export default function InquiryProducts({
  items,
}: any) {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Product
            </th>

            <th className="p-3 text-right">
              Qty
            </th>

            <th className="p-3 text-left">
              Unit
            </th>

          </tr>

        </thead>

        <tbody>

          {(items || []).map((item: any) => (

            <tr
              key={item.id}
              className="border-t"
            >

              <td className="p-3">
                {item.product_name}
              </td>

              <td className="p-3 text-right">
                {item.quantity}
              </td>

              <td className="p-3">
                {item.unit}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}