export default function ShipmentCard() {
  return (
    <div className="grid grid-cols-2 gap-4">

      <div className="border rounded-lg p-4">
        <div className="text-sm text-gray-500">
          ETD
        </div>

        <div className="font-semibold">
          -
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="text-sm text-gray-500">
          ETA
        </div>

        <div className="font-semibold">
          -
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="text-sm text-gray-500">
          Container
        </div>

        <div className="font-semibold">
          -
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="text-sm text-gray-500">
          Forwarder
        </div>

        <div className="font-semibold">
          -
        </div>
      </div>

    </div>
  );
}