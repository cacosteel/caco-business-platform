const activities = [
  "Order created",
  "Quotation approved",
  "Production started",
  "Packing completed",
  "Shipment booked",
];

export default function RecentActivity() {
  return (
    <div className="space-y-3">

      {activities.map((item) => (

        <div
          key={item}
          className="border-l-4 border-cyan-500 pl-4 py-2"
        >
          {item}
        </div>

      ))}

    </div>
  );
}
