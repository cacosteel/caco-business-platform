type Event = {
  title: string;
  date: string;
};

type Props = {
  events: Event[];
};

export default function Timeline({
  events,
}: Props) {
  return (
    <div className="space-y-4">

      {events.map((event, index) => (

        <div
          key={index}
          className="border-l-2 border-red-600 pl-4"
        >

          <div className="font-medium">
            {event.title}
          </div>

          <div className="text-sm text-gray-500">
            {event.date}
          </div>

        </div>

      ))}

    </div>
  );
}
