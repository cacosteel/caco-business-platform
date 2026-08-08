type Props = {
  steps: string[];
  current: number;
};

export default function ProgressStepper({
  steps,
  current,
}: Props) {
  return (
    <div className="flex items-center gap-4 overflow-x-auto">

      {steps.map((step, index) => (

        <div
          key={step}
          className="flex items-center"
        >

          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              index <= current
                ? "bg-cyan-500 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {index + 1}
          </div>

          <div className="ml-2 mr-6 whitespace-nowrap text-sm">
            {step}
          </div>

        </div>

      ))}

    </div>
  );
}
