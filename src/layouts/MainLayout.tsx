import { Outlet, Link } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">CACO</h1>

        <nav className="flex flex-col gap-4">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/companies">Companies</Link>
          <Link to="/contacts">Contacts</Link>
          <Link to="/products">Products</Link>
          <Link to="/rfqs">RFQs</Link>
          <Link to="/documents">Documents</Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}