type Props = {
  label: string;
  value: any;
};

export default function KeyValue({
  label,
  value,
}: Props) {
  return (
    <div className="flex justify-between py-2 border-b">

      <span className="text-gray-500">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>

    </div>
  );
}