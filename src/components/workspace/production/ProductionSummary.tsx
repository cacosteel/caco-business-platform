export default function ProductionSummary() {
  return (
    <div className="grid grid-cols-4 gap-4">

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Progress
        </div>
        <div className="text-3xl font-bold mt-2">
          0%
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Factory
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Start
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="text-sm text-gray-500">
          Finish
        </div>
        <div className="text-lg font-semibold mt-2">
          -
        </div>
      </div>

    </div>
  );
}