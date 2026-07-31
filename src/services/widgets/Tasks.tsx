export default function Tasks() {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="font-semibold mb-4">Tasks</h3>

      <div className="space-y-2">
        <label className="flex gap-2">
          <input type="checkbox" />
          Follow up customer
        </label>

        <label className="flex gap-2">
          <input type="checkbox" />
          Prepare quotation
        </label>

        <label className="flex gap-2">
          <input type="checkbox" />
          Book shipment
        </label>
      </div>
    </div>
  );
}