import type { order } from "../../types/order";

type Props = {
  orders: order[];
  onDelete: (id: string) => Promise<void>;
};

export default function OrderTable({
  orders,
  onDelete,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Order No</th>
          <th>Order Date</th>
          <th>Delivery Date</th>
          <th>Status</th>
          <th>Total</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.order_no}</td>
            <td>{order.order_date}</td>
            <td>{order.delivery_date}</td>
            <td>{order.status}</td>
            <td>
              {order.total_amount} {order.currency}
            </td>
            <td>
              <button onClick={() => onDelete(order.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}