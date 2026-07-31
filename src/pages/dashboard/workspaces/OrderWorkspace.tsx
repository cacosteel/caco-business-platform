import { useState } from "react";
import { useParams } from "react-router-dom";

import WorkspaceLayout from "../../../components/layout/WorkspaceLayout";
import WorkspaceHeader from "../../../components/workspace/WorkspaceHeader";
import WorkspaceTabs from "../../../components/workspace/WorkspaceTabs";
import StatusBadge from "../../../components/workspace/StatusBadge";
import SidebarCard from "../../../components/workspace/SidebarCard";
import KeyValue from "../../../components/workspace/KeyValue";
import Timeline from "../../../components/workspace/Timeline";
import NotesPanel from "../../../components/workspace/NotesPanel";

import OrderSummaryCard from "../../../components/workspace/cards/OrderSummaryCard";
import OrderShippingCard from "../../../components/workspace/cards/OrderShippingCard";

import OrderItemsTable from "../../../components/workspace/items/OrderItemsTable";

import ProductionSummary from "../../../components/workspace/production/ProductionSummary";
import ProductionProgress from "../../../components/workspace/production/ProductionProgress";
import ProductionTasks from "../../../components/workspace/production/ProductionTasks";

import PackingSummary from "../../../components/workspace/packing/PackingSummary";
import PackingList from "../../../components/workspace/packing/PackingList";

import DocumentsTable from "../../../components/workspace/documents/DocumentsTable";
import DocumentUpload from "../../../components/workspace/documents/DocumentUpload";

import PaymentSummary from "../../../components/workspace/payments/PaymentSummary";
import PaymentHistory from "../../../components/workspace/payments/PaymentHistory";

import { useOrderWorkspace } from "../../../hooks/useOrderWorkspace";
import { useOrderItems } from "../../../hooks/useOrderItems";

const tabs = [
  "Overview",
  "Items",
  "Production",
  "Packing",
  "Shipment",
  "Documents",
  "Payments",
  "Timeline",
  "Notes",
];

export default function OrderWorkspace() {

  const { id } = useParams();

  const { loading, order } =
    useOrderWorkspace(id);

  const {
    items,
    loading: itemsLoading,
  } = useOrderItems(id);

  const [tab, setTab] =
    useState("Overview");

  if (loading || itemsLoading) {
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
          title={order?.order_no ?? "-"}
          subtitle={
            order?.quotations?.inquiries?.companies?.name ?? "-"
          }
          actions={
            <StatusBadge status={order?.status} />
          }
        />

      }

      sidebar={

        <>

          <SidebarCard title="Order">

            <KeyValue
              label="Quotation"
              value={order?.quotations?.quotation_no ?? "-"}
            />

            <KeyValue
              label="Customer"
              value={order?.quotations?.inquiries?.companies?.name ?? "-"}
            />

            <KeyValue
              label="Currency"
              value={order?.currency ?? "-"}
            />

            <KeyValue
              label="Amount"
              value={order?.total_amount ?? 0}
            />

            <KeyValue
              label="Status"
              value={order?.status ?? "-"}
            />

          </SidebarCard>

        </>

      }

    >

      <WorkspaceTabs
        tabs={tabs}
        active={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <OrderSummaryCard order={order} />
      )}

      {tab === "Items" && (
        <OrderItemsTable items={items} />
      )}

      {tab === "Production" && (

        <div className="space-y-6">

          <ProductionSummary />

          <ProductionProgress progress={0} />

          <ProductionTasks />

        </div>

      )}

      {tab === "Packing" && (

        <div className="space-y-6">

          <PackingSummary />

          <PackingList />

        </div>

      )}

      {tab === "Shipment" && (
        <OrderShippingCard />
      )}

      {tab === "Documents" && (

        <div className="space-y-6">

          <DocumentUpload />

          <DocumentsTable />

        </div>

      )}

      {tab === "Payments" && (

        <div className="space-y-6">

          <PaymentSummary />

          <PaymentHistory />

        </div>

      )}

      {tab === "Timeline" && (

        <Timeline
          events={[
            {
              title: "Order Created",
              date: order?.created_at ?? "",
            },
          ]}
        />

      )}

      {tab === "Notes" && (
        <NotesPanel />
      )}

    </WorkspaceLayout>

  );

}