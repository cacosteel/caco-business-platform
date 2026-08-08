import { useOrders } from "../../hooks/useOrders";
import {
  createOrder,
  deleteOrder,
} from "../../services/orderService";
import OrderForm from "../../components/orders/OrderForm";
import OrderTable from "../../components/orders/OrderTable";
import PageHeader from "../../components/common/PageHeader";

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
      <PageHeader
        title="Orders & Operations"
        subtitle="Continue accepted business through production, shipment, documents and payment."
      />

      <div className="sales-panel">
        <OrderForm onSave={addOrder} />
      </div>

      <p style={{ color: "var(--caco-muted)", margin: "16px 0 8px" }}>
        Total orders: {orders.length}
      </p>

      <OrderTable
        orders={orders}
        onDelete={removeOrder}
      />
    </>
  );
}
