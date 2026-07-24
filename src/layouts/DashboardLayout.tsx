import { Link, Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "260px",
          background: "#0B1F3A",
          color: "#ffffff",
          padding: "20px",
        }}
      >
        <h2>CACO</h2>

        <hr style={{ margin: "20px 0" }} />

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/dashboard/companies">Companies</Link>
          <Link to="/dashboard/contacts">Contacts</Link>
          <Link to="/dashboard/products">Products</Link>
          <Link to="/dashboard/inquiries">Inquiries</Link>
          <Link to="/dashboard/quotations">Quotations</Link>
          <Link to="/dashboard/orders">Orders</Link>
          <Link to="/dashboard/documents">Documents</Link>
          <Link to="/dashboard/settings">Settings</Link>
        </nav>
      </aside>

      <main
        style={{
          flex: 1,
          padding: "30px",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}