import { useState } from "react";
import { useParams } from "react-router-dom";

import WorkspaceLayout from "../../../../components/layout/WorkspaceLayout";
import WorkspaceHeader from "../../../../components/workspace/WorkspaceHeader";
import WorkspaceTabs from "../../../../components/workspace/WorkspaceTabs";
import SidebarCard from "../../../../components/workspace/SidebarCard";
import KeyValue from "../../../../components/workspace/KeyValue";
import StatusBadge from "../../../../components/workspace/StatusBadge";

import CompanyOverview from "../../../../components/workspace/company/CompanyOverview";
import CompanyContacts from "../../../../components/workspace/company/CompanyContacts";
import CompanyInquiries from "../../../../components/workspace/company/CompanyInquiries";
import CompanyQuotations from "../../../../components/workspace/company/CompanyQuotations";
import CompanyOrders from "../../../../components/workspace/company/CompanyOrders";

import { useCompanyWorkspace } from "../../../../hooks/companyWorkspace/useCompanyWorkspace";

const tabs = [
  "Overview",
  "Contacts",
  "Inquiries",
  "Quotations",
  "Orders",
];

export default function CompanyWorkspace() {

  const { id } = useParams();

  const {
    loading,
    company,
  } = useCompanyWorkspace(id);

  const [tab, setTab] =
    useState("Overview");

  if (loading) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (

    <WorkspaceLayout

      header={
        <WorkspaceHeader
          title={company?.name ?? "-"}
          subtitle={company?.country ?? "-"}
          actions={
            <StatusBadge
              status={company?.status}
            />
          }
        />
      }

      sidebar={
        <SidebarCard title="Company">

          <KeyValue
            label="Country"
            value={company?.country}
          />

          <KeyValue
            label="City"
            value={company?.city}
          />

          <KeyValue
            label="Website"
            value={company?.website}
          />

        </SidebarCard>
      }

    >

      <WorkspaceTabs
        tabs={tabs}
        active={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <CompanyOverview
          company={company}
        />
      )}

      {tab === "Contacts" && (
        <CompanyContacts
          contacts={company?.company_contacts}
        />
      )}

      {tab === "Inquiries" && (
        <CompanyInquiries
          inquiries={company?.inquiries}
        />
      )}

      {tab === "Quotations" && (
        <CompanyQuotations
          quotations={[]}
        />
      )}

      {tab === "Orders" && (
        <CompanyOrders
          orders={[]}
        />
      )}

    </WorkspaceLayout>

  );

}