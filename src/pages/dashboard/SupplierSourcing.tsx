import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Factory, GitCompareArrows, Send } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

export default function SupplierSourcing() {
  return (
    <div className="sales-page">
      <PageHeader
        title="Supplier Sourcing"
        subtitle="Request and compare mill prices against the original client inquiry."
        action={
          <Link className="caco-secondary-link" to="/dashboard/inquiries">
            <ArrowLeft size={14} /> Open inquiries
          </Link>
        }
      />

      <div className="sales-mini-flow">
        <div><Send size={18} /><span><strong>Send RFQ</strong><small>Select inquiry lines</small></span></div>
        <div><Factory size={18} /><span><strong>Record offers</strong><small>Price, terms and deviations</small></span></div>
        <div><GitCompareArrows size={18} /><span><strong>Compare & select</strong><small>Prepare internal costing</small></span></div>
      </div>

      <section className="sales-panel sales-table-panel">
        <div className="sales-section-heading">
          <div>
            <span className="sales-eyebrow">Internal workspace</span>
            <h2>Supplier requests and offers</h2>
          </div>
          <span className="sales-private-label">Internal information</span>
        </div>

        <div className="sales-empty-table">
          <div className="sales-table-head">
            <span>Supplier</span><span>Inquiry</span><span>Offer terms</span><span>Validity</span><span>Status</span>
          </div>
          <div className="sales-empty-state">
            <Factory size={28} strokeWidth={1.5} />
            <h3>No supplier offers recorded yet</h3>
            <p>Supplier requests will be created from selected client inquiry lines.</p>
          </div>
        </div>
      </section>

      <section className="sales-panel">
        <div className="sales-panel-title"><CheckCircle2 size={18} /><h2>Comparison will include</h2></div>
        <div className="sales-feature-grid">
          <span>Mill unit price</span><span>Freight & insurance</span><span>Payment terms</span>
          <span>Production date</span><span>Technical deviations</span><span>Calculated margin</span>
        </div>
      </section>
    </div>
  );
}
