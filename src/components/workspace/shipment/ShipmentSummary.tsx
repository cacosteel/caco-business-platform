export default function ShipmentSummary() {
  return (
    <div className="grid grid-cols-4 gap-4">

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          ETD
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          ETA
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Vessel
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Container
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

    </div>
  );
}