import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  PackageCheck,
  Send,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { useInquiries } from "../../hooks/useInquiries";
import { useQuotations } from "../../hooks/useQuotations";
import { useOrders } from "../../hooks/useOrders";

const stages = [
  {
    number: "01",
    title: "Client Inquiry",
    description: "Capture customer requirements, technical specifications and quantities.",
    path: "/dashboard/inquiries",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Supplier Sourcing",
    description: "Request prices from mills and compare offers, terms and deviations.",
    path: "/dashboard/supplier-sourcing",
    icon: Send,
  },
  {
    number: "03",
    title: "Customer Quotation",
    description: "Build a controlled customer offer from the selected sourcing result.",
    path: "/dashboard/quotations",
    icon: BadgeDollarSign,
  },
  {
    number: "04",
    title: "Sales Contract",
    description: "Convert the accepted quotation into a revision-controlled contract.",
    path: "/dashboard/sales-contracts",
    icon: FileCheck2,
  },
  {
    number: "05",
    title: "Order & Operation",
    description: "Continue with production, shipment, documents and payment tracking.",
    path: "/dashboard/orders",
    icon: PackageCheck,
  },
];

export default function SalesManagement() {
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { orders, loading: ordersLoading } = useOrders();
  const loading = inquiriesLoading || quotationsLoading || ordersLoading;

  return (
    <div className="sales-page">
      <PageHeader
        title="Sales Management"
        subtitle="One connected workflow from the first customer inquiry to contract and order execution."
      />

      <section className="sales-hero">
        <div>
          <span className="sales-eyebrow">Commercial workflow</span>
          <h2>Every offer starts from one reliable source of information.</h2>
          <p>
            Technical details move forward through each stage while supplier prices,
            internal costs and margins remain protected.
          </p>
        </div>
        <div className="sales-hero-badge">
          <ShieldCheck size={22} />
          <div>
            <strong>Controlled records</strong>
            <span>Revisions and history preserved</span>
          </div>
        </div>
      </section>

      <section className="sales-metrics" aria-label="Sales summary">
        <div className="sales-metric">
          <span>Client inquiries</span>
          <strong>{loading ? "—" : inquiries.length}</strong>
          <small>Requirements received</small>
        </div>
        <div className="sales-metric">
          <span>Customer quotations</span>
          <strong>{loading ? "—" : quotations.length}</strong>
          <small>Offers prepared</small>
        </div>
        <div className="sales-metric">
          <span>Orders & operations</span>
          <strong>{loading ? "—" : orders.length}</strong>
          <small>Commercial records opened</small>
        </div>
      </section>

      <section className="sales-section">
        <div className="sales-section-heading">
          <div>
            <span className="sales-eyebrow">Process map</span>
            <h2>Sales workflow</h2>
          </div>
          <span className="sales-section-note">Select a stage to open its workspace</span>
        </div>

        <div className="sales-stage-grid">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <Link className="sales-stage-card" key={stage.title} to={stage.path}>
                <div className="sales-stage-topline">
                  <span>{stage.number}</span>
                  <Icon size={19} strokeWidth={1.8} />
                </div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <div className="sales-stage-link">
                  Open workspace <ArrowRight size={14} />
                </div>
                {index < stages.length - 1 && (
                  <span className="sales-stage-connector" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="sales-bottom-grid">
        <div className="sales-panel">
          <div className="sales-panel-title">
            <FileText size={18} />
            <h2>Document structure</h2>
          </div>
          <ul className="sales-check-list">
            <li><CheckCircle2 size={15} /> Inquiry without mandatory pricing</li>
            <li><CheckCircle2 size={15} /> Multiple supplier offers per inquiry</li>
            <li><CheckCircle2 size={15} /> Customer quotation with revisions</li>
            <li><CheckCircle2 size={15} /> Contract with versioned general conditions</li>
          </ul>
        </div>

        <div className="sales-panel sales-panel-accent">
          <div className="sales-panel-title">
            <ShieldCheck size={18} />
            <h2>Information protection</h2>
          </div>
          <p>
            Supplier identities, purchase costs and margins belong to the internal
            sourcing workspace. Customer-facing documents contain only the approved
            commercial offer.
          </p>
        </div>
      </section>
    </div>
  );
}
