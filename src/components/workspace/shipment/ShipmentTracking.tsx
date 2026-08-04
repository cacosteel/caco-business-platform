export default function ShipmentTracking() {

  return (

    <div className="bg-white rounded-lg shadow p-5">

      <h2 className="font-semibold mb-4">
        Shipment Tracking
      </h2>

      <div className="space-y-3">

        <div className="border-l-4 border-red-600 pl-4">
          Booking Pending
        </div>

        <div className="border-l-4 border-gray-300 pl-4">
          Container Loading
        </div>

        <div className="border-l-4 border-gray-300 pl-4">
          Vessel Departure
        </div>

        <div className="border-l-4 border-gray-300 pl-4">
          Arrived
        </div>

      </div>

    </div>

  );

}
