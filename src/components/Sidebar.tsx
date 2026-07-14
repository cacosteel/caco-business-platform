export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">
        CACO
      </h1>

      <nav className="space-y-4">

        <div>Dashboard</div>

        <div>Companies</div>

        <div>Products</div>

        <div>RFQs</div>

        <div>Documents</div>

        <div>Users</div>

        <div>Settings</div>

      </nav>
    </aside>
  );
}