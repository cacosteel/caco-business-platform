type Props = {
  items: any[];
};

export default function OrderItemsTable({
  items,
}: Props) {
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

            <th className="p-3 text-right">
              Unit
            </th>

            <th className="p-3 text-right">
              Unit Price
            </th>

            <th className="p-3 text-right">
              Total
            </th>

          </tr>

        </thead>

        <tbody>

          {items.length === 0 && (

            <tr>

              <td
                colSpan={5}
                className="p-6 text-center text-gray-500"
              >
                No products
              </td>

            </tr>

          )}

          {items.map((item) => (

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

              <td className="p-3 text-right">
                {item.unit}
              </td>

              <td className="p-3 text-right">
                {item.unit_price}
              </td>

              <td className="p-3 text-right">
                {item.total_price}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}