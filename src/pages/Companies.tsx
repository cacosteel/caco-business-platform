import { useState } from "react";
import { useCompanies } from "../hooks/useCompanies";
import PageHeader from "../components/common/PageHeader";

export default function Companies() {
  const { companies } = useCompanies();

  const [search, setSearch] = useState("");

  const filteredCompanies = companies.filter((company: any) =>
    company.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Manage customers, suppliers and partners."
        action={
          <button
            style={{
              background: "#C62828",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Add Company
          </button>
        }
      />

      <div
        style={{
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 320,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 10px rgba(0,0,0,.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #e5e7eb",
                textAlign: "left",
              }}
            >
              <th style={{ padding: 12 }}>Company</th>
              <th style={{ padding: 12 }}>Country</th>
              <th style={{ padding: 12 }}>Type</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredCompanies.map((company: any) => (
              <tr
                key={company.id}
                style={{
                  borderBottom: "1px solid #f1f1f1",
                }}
              >
                <td style={{ padding: 12 }}>
                  {company.name}
                </td>

                <td style={{ padding: 12 }}>
                  {company.country || "-"}
                </td>

                <td style={{ padding: 12 }}>
                  {company.type || "-"}
                </td>

                <td style={{ padding: 12 }}>
                  <button
                    style={{
                      marginRight: 8,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredCompanies.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#777",
                  }}
                >
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
