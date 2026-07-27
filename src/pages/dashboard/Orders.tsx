import { useOrders } from "../../hooks/useOrders";
import {
  createOrder,
  deleteOrder,
} from "../../services/orderService";
import OrderForm from "../../components/orders/OrderForm";
import OrderTable from "../../components/orders/OrderTable";

export default function Orders() {
  const { orders, loading, refresh } = useOrders();

  async function addOrder(data: {
    quotation_id: string;
    order_no: string;
    order_date: string;
    delivery_date: string;
    status: string;
    total_amount: number;
    currency: string;
    notes: string;
  }) {
    await createOrder(data);
    refresh();
  }

  async function removeOrder(id: string) {
    await deleteOrder(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Orders</h1>

      <OrderForm onSave={addOrder} />

      <p>Total Orders: {orders.length}</p>

      <OrderTable
        orders={orders}
        onDelete={removeOrder}
      />
    </>
  );
}