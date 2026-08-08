export default function PaymentSummary() {
  return (
    <div className="grid grid-cols-4 gap-4">

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Total
        </div>
        <div className="text-2xl font-bold mt-2">
          0 USD
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Paid
        </div>
        <div className="text-2xl font-bold mt-2 text-green-600">
          0 USD
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Outstanding
        </div>
        <div className="text-2xl font-bold mt-2 text-red-600">
          0 USD
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Due Date
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

    </div>
  );
}