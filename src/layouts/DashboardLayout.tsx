import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ContactRound,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type NavChild = {
  name: string;
  path: string;
};

type NavItem = {
  name: string;
  path?: string;
  group?: "communications";
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  items?: NavChild[];
};

export default function DashboardLayout() {
  const location = useLocation();
  const { profile } = useAuth();
  const [openGroups, setOpenGroups] = useState({
    communications: location.pathname.includes("email"),
  });

  const communicationItems: NavChild[] = [
    { name: "Email Templates", path: "/dashboard/email-templates" },
    { name: "Compose Email", path: "/dashboard/compose-email" },
    { name: "Sent Emails", path: "/dashboard/sent-emails" },
  ];

  const memberMenuItems: NavItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Companies", path: "/dashboard/companies", icon: Building2 },
    { name: "Contacts", path: "/dashboard/contacts", icon: ContactRound },
    { name: "Email Outreach", group: "communications", icon: Megaphone, items: communicationItems },
    { name: "Product Catalogue", path: "/dashboard/products", icon: PackageSearch },
    { name: "My Profile", path: "/dashboard/profile", icon: CircleUserRound },
  ];

  const adminMenuItems: NavItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Companies", path: "/dashboard/companies", icon: Building2 },
    { name: "Contacts", path: "/dashboard/contacts", icon: ContactRound },
    { name: "Email Outreach", group: "communications", icon: Megaphone, items: communicationItems },
    { name: "Product Catalogue", path: "/dashboard/products", icon: PackageSearch },
    { name: "My Profile", path: "/dashboard/profile", icon: CircleUserRound },
  ];

  const menuItems: NavItem[] =
    profile?.role === "admin"
      ? [
          ...adminMenuItems,
          {
            name: "Administration",
            path: "/dashboard/administration",
            icon: Settings,
          },
        ]
      : memberMenuItems;

  return (
    <div className="caco-shell">
      <aside className="caco-sidebar">
        <div className="caco-brand">
          <img className="caco-brand-logo" src="/uniba-logo.webp" alt="UNIBA" />
          <div>
            <div className="caco-brand-name">UNIBA Connect</div>
            <div className="caco-brand-version">Contacts &amp; Catalogue</div>
          </div>
        </div>

        <nav className="caco-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (item.items && item.group) {
              const groupOpen = openGroups[item.group];
              const groupActive = item.items.some(
                (child) =>
                  location.pathname === child.path ||
                  location.pathname.startsWith(`${child.path}/`),
              );

              return (
                <div className="caco-nav-group" key={item.group}>
                  <button
                    className={`caco-nav-item caco-nav-group-button ${groupActive ? "is-group-active" : ""}`}
                    onClick={() =>
                      setOpenGroups((current) => ({
                        ...current,
                        [item.group!]: !current[item.group!],
                      }))
                    }
                    type="button"
                  >
                    <span className="caco-nav-label">
                      <Icon size={15} strokeWidth={1.8} />
                      {item.name}
                    </span>
                    {groupOpen ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  {groupOpen && (
                    <div className="caco-nav-children">
                      {item.items.map((child) => {
                        const active =
                          location.pathname === child.path ||
                          location.pathname.startsWith(`${child.path}/`);
                        return (
                          <Link
                            className={`caco-nav-child ${active ? "is-active" : ""}`}
                            key={child.path}
                            to={child.path}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <Link
                className={`caco-nav-item ${active ? "is-active" : ""}`}
                key={item.path}
                to={item.path!}
              >
                <span className="caco-nav-label">
                  <Icon size={15} strokeWidth={1.8} />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="caco-user-card">
          <div className="caco-user-avatar">
            {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="caco-user-name">{profile?.full_name ?? "User"}</div>
            <div className="caco-user-role">{profile?.role}</div>
          </div>
        </div>
      </aside>

      <main className="caco-main">
        <div className="caco-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
