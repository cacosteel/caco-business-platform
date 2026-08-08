type Item = {
  user: string;
  action: string;
  time: string;
};

type Props = {
  items: Item[];
};

export default function ActivityFeed({
  items,
}: Props) {
  return (
    <div className="space-y-3">

      {items.map((item, index) => (

        <div
          key={index}
          className="bg-white rounded-lg border p-3"
        >
          <div className="font-medium">
            {item.user}
          </div>

          <div className="text-sm">
            {item.action}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {item.time}
          </div>
        </div>

      ))}

    </div>
  );
}