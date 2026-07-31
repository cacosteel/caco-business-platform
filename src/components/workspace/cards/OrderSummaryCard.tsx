import InfoCard from "../InfoCard";

export default function OrderSummaryCard({
  order,
}: any) {

  return (

    <div className="grid grid-cols-4 gap-4">

      <InfoCard
        title="Customer"
        value={
          order?.quotations?.inquiries
            ?.companies?.name ?? "-"
        }
      />

      <InfoCard
        title="Quotation"
        value={
          order?.quotations
            ?.quotation_no ?? "-"
        }
      />

      <InfoCard
        title="Amount"
        value={`${order?.total_amount ?? 0} ${order?.currency ?? ""}`}
      />

      <InfoCard
        title="Status"
        value={order?.status}
      />

    </div>

  );

}