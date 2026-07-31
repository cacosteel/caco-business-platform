import { useState } from "react";
import { useParams } from "react-router-dom";

import WorkspaceLayout from "../../../../components/layout/WorkspaceLayout";
import WorkspaceHeader from "../../../../components/workspace/WorkspaceHeader";
import WorkspaceTabs from "../../../../components/workspace/WorkspaceTabs";
import SidebarCard from "../../../../components/workspace/SidebarCard";
import KeyValue from "../../../../components/workspace/KeyValue";
import StatusBadge from "../../../../components/workspace/StatusBadge";

import InquiryOverview from "../../../../components/workspace/inquiry/InquiryOverview";
import InquiryProducts from "../../../../components/workspace/inquiry/InquiryProducts";
import InquiryQuotations from "../../../../components/workspace/inquiry/InquiryQuotations";

import { useInquiryWorkspace } from "../../../../hooks/inquiryWorkspace/useInquiryWorkspace";

const tabs = [
  "Overview",
  "Products",
  "Quotations",
];

export default function InquiryWorkspace() {

  const { id } = useParams();

  const {
    loading,
    inquiry,
  } = useInquiryWorkspace(id);

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
          title={inquiry?.inquiry_no ?? "-"}
          subtitle={inquiry?.companies?.name ?? "-"}
          actions={
            <StatusBadge
              status={inquiry?.status}
            />
          }
        />
      }

      sidebar={
        <SidebarCard title="Inquiry">

          <KeyValue
            label="Company"
            value={inquiry?.companies?.name}
          />

          <KeyValue
            label="Status"
            value={inquiry?.status}
          />

          <KeyValue
            label="Date"
            value={inquiry?.created_at}
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
        <InquiryOverview
          inquiry={inquiry}
        />
      )}

      {tab === "Products" && (
        <InquiryProducts
          items={inquiry?.inquiry_items}
        />
      )}

      {tab === "Quotations" && (
        <InquiryQuotations
          quotations={inquiry?.quotations}
        />
      )}

    </WorkspaceLayout>

  );

}