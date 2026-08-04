import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function DashboardLayout() {
  const location = useLocation();
  const { profile } = useAuth();
  const [openGroups, setOpenGroups] = useState({ marketing: true, sales: false });

  const memberMenuItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "My Company", path: "/dashboard/companies" },
    { name: "Contacts", path: "/dashboard/contacts" },
    { name: "Marketing", group: "marketing", items: [{ name: "Email Templates", path: "/dashboard/email-templates" }, { name: "Compose Email", path: "/dashboard/compose-email" }, { name: "Sent Emails", path: "/dashboard/sent-emails" }] },
    { name: "My Profile", path: "/dashboard/profile" },
  ];

  const adminMenuItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Companies", path: "/dashboard/companies" },
    { name: "Contacts", path: "/dashboard/contacts" },
    { name: "Marketing", group: "marketing", items: [{ name: "Email Templates", path: "/dashboard/email-templates" }, { name: "Compose Email", path: "/dashboard/compose-email" }, { name: "Sent Emails", path: "/dashboard/sent-emails" }] },
    { name: "Products", path: "/dashboard/products" },
    { name: "Sales", group: "sales", items: [{ name: "Inquiries", path: "/dashboard/inquiries" }, { name: "Quotations", path: "/dashboard/quotations" }, { name: "Orders", path: "/dashboard/orders" }, { name: "Documents", path: "/dashboard/documents" }] },
    { name: "My Profile", path: "/dashboard/profile" },
  ];

  const menuItems = profile?.role === "admin"
    ? [...adminMenuItems, { name: "Administration", path: "/dashboard/administration" }]
    : memberMenuItems;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--caco-page)",
      }}
    >
      <aside
        style={{
          width: 235,
          background: "var(--caco-sidebar)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: 18,
        }}
      >
        <div style={{ marginBottom: 18, fontSize: 13, lineHeight: 1.5, color: "var(--caco-sidebar-muted)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>CACO Business Platform</div>
          <div>Version 1.0</div>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {menuItems.map((item) => item.items ? <div key={item.group}><button onClick={() => setOpenGroups((current) => ({ ...current, [item.group]: !current[item.group as keyof typeof current] }))} style={{ width: "100%", border: 0, textAlign: "left", background: "transparent", color: "#fff", padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{item.name} {openGroups[item.group as keyof typeof openGroups] ? "−" : "+"}</button>{openGroups[item.group as keyof typeof openGroups] && item.items.map((child) => { const active = location.pathname === child.path; return <Link key={child.path} to={child.path} style={{ display: "block", textDecoration: "none", color: "#fff", padding: "8px 12px 8px 24px", borderRadius: 6, background: active ? "var(--caco-primary)" : "transparent", fontSize: 12, fontWeight: active ? 600 : 400 }}>{child.name}</Link>; })}</div> : (() => { const active = location.pathname === item.path; return <Link key={item.path} to={item.path} style={{ textDecoration: "none", color: "#fff", padding: "9px 12px", borderRadius: 6, background: active ? "var(--caco-primary)" : "transparent", fontSize: 13, fontWeight: active ? 600 : 400 }}>{item.name}</Link>; })())}
        </nav>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            fontSize: 13,
            color: "var(--caco-sidebar-muted)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{profile?.full_name ?? "User"}</div>
          <div style={{ fontSize: 12, textTransform: "capitalize" }}>{profile?.role}</div>
        </div>
      </aside>

      <main
  style={{
    flex: 1,
    background: "var(--caco-page)",
  }}
>
  <div
    style={{
      padding: 22,
    }}
  >
    <Outlet />
  </div>
</main>
    </div>
  );
}
