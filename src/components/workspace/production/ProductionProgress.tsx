type Props = {
  progress?: number;
};

export default function ProductionProgress({
  progress = 0,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-5">

      <div className="flex justify-between mb-2">

        <span>
          Production Progress
        </span>

        <span>
          {progress}%
        </span>

      </div>

      <div className="w-full h-3 rounded bg-gray-200">

        <div
          className="h-3 rounded bg-cyan-500"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>
  );
}
