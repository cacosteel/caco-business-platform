const tasks = [
  "Material Ready",
  "Cutting",
  "Welding",
  "Galvanizing",
  "Painting",
  "Packing",
];

export default function ProductionTasks() {
  return (
    <div className="bg-white rounded-lg shadow p-5">

      <h2 className="font-semibold mb-4">
        Production Tasks
      </h2>

      <div className="space-y-3">

        {tasks.map((task) => (

          <label
            key={task}
            className="flex items-center gap-3"
          >

            <input type="checkbox" />

            {task}

          </label>

        ))}

      </div>

    </div>
  );
}