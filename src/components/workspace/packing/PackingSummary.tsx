export default function PackingSummary() {
  return (
    <div className="grid grid-cols-4 gap-4">

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Bundles
        </div>
        <div className="text-3xl font-bold mt-2">
          0
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Packages
        </div>
        <div className="text-3xl font-bold mt-2">
          0
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Net Weight
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Gross Weight
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

    </div>
  );
}