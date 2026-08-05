import { Link } from "react-router-dom";
import { ArrowLeft, FileCheck2, FileSignature, History, Scale } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

export default function SalesContracts() {
  return (
    <div className="sales-page">
      <PageHeader
        title="Sales Contracts"
        subtitle="Create a controlled contract from the customer’s accepted quotation revision."
        action={
          <Link className="caco-secondary-link" to="/dashboard/quotations">
            <ArrowLeft size={14} /> Open quotations
          </Link>
        }
      />

      <div className="sales-mini-flow contract-flow">
        <div><FileCheck2 size={18} /><span><strong>Accepted quotation</strong><small>Approved revision</small></span></div>
        <div><FileSignature size={18} /><span><strong>Contract draft</strong><small>Commercial and material schedule</small></span></div>
        <div><Scale size={18} /><span><strong>Agreed terms</strong><small>Signed contract and conditions</small></span></div>
      </div>

      <section className="sales-panel sales-table-panel">
        <div className="sales-section-heading">
          <div>
            <span className="sales-eyebrow">Contract register</span>
            <h2>Sales contracts</h2>
          </div>
          <span className="sales-section-note">Generated only from accepted quotations</span>
        </div>

        <div className="sales-empty-table">
          <div className="sales-table-head">
            <span>Contract no.</span><span>Customer</span><span>Quotation</span><span>Value</span><span>Status</span>
          </div>
          <div className="sales-empty-state">
            <FileSignature size={28} strokeWidth={1.5} />
            <h3>No sales contracts created yet</h3>
            <p>An accepted quotation will become the source for the first contract revision.</p>
          </div>
        </div>
      </section>

      <section className="sales-bottom-grid">
        <div className="sales-panel">
          <div className="sales-panel-title"><FileCheck2 size={18} /><h2>Contract package</h2></div>
          <p>Commercial summary, detailed material schedule and the applicable general conditions version.</p>
        </div>
        <div className="sales-panel">
          <div className="sales-panel-title"><History size={18} /><h2>Revision history</h2></div>
          <p>Every customer change creates a new revision without altering a previously sent document.</p>
        </div>
      </section>
    </div>
  );
}
