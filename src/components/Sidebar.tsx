import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded ${
      isActive ? "bg-red-600 text-white" : "text-gray-300 hover:bg-slate-800"
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">
        CACO
      </h1>

      <nav className="space-y-2">
        <NavLink to="/" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/companies" className={linkClass}>Companies</NavLink>
        <NavLink to="/products" className={linkClass}>Products</NavLink>
        <NavLink to="/rfqs" className={linkClass}>RFQs</NavLink>
        <NavLink to="/documents" className={linkClass}>Documents</NavLink>
        <NavLink to="/users" className={linkClass}>Users</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
      </nav>
    </aside>
  );
}
