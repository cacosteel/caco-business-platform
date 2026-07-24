import { Outlet, Link } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">CACO Business Platform</h1>

        <nav className="flex gap-6">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/companies">Companies</Link>
          <Link to="/contacts">Contacts</Link>
          <Link to="/products">Products</Link>
          <Link to="/rfqs">RFQs</Link>
        </nav>
      </header>

      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}