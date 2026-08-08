# Sales Management V1 Specification

## 1. Purpose

Sales Management V1 provides a controlled, traceable workflow for international steel sales:

1. Record a client inquiry.
2. Send separate requests for quotation (RFQs) to selected suppliers.
3. Record and compare supplier offers.
4. Calculate internal landed cost and selling price.
5. Issue a customer quotation.
6. Convert an accepted quotation into a sales contract.
7. Convert a signed contract into an order/operation.
8. Record packing, loading, shipment, invoicing, and payments.

V1 is English-only. It prioritizes reliable records, confidentiality, document control, and audit history over automation.

## 2. Core Workflow

```text
Client Inquiry
  -> Supplier RFQs (one per supplier)
  -> Supplier Offers
  -> Internal Costing and Supplier Selection
  -> Customer Quotation
  -> Sales Contract
  -> Order / Operation
  -> Loading, Shipment, Final Invoice, and Completion
```

One inquiry may be sent to many suppliers. One customer quotation may select different suppliers for different lines, but a single quotation line is not split between suppliers in V1.

## 3. Roles and Access

### 3.1 Admin

- Full access to all sales records and documents.
- Can see supplier identities, supplier offers, costs, margins, and internal notes.
- Is the only role permitted to send RFQs, quotations, and contracts in V1.
- Can configure seller bank accounts, document categories, product specification fields, and General Conditions versions.
- Can approve soft deletion and perform documented overrides.

### 3.2 Authorised partner-company user

- Can access only sales workspaces explicitly assigned by Admin.
- May work with assigned records according to granted permissions.
- Cannot send RFQs, quotations, or contracts in V1.

### 3.3 Customer-company user

- Can access only client-facing records and documents belonging to the user's own company.
- Must never see supplier identities, supplier correspondence, supplier prices, internal costs, margins, or alternative sources.

### 3.4 Supplier

- Has no platform login in V1.
- Receives and returns RFQs and offers by email.

## 4. Confidentiality Rules

- The system creates one RFQ record for each supplier.
- The system sends a separate email for each supplier; multi-supplier To, CC, or BCC messages are prohibited.
- A supplier must never see another supplier's name, email address, RFQ reference, offer, or response status.
- Customer identity is hidden on supplier RFQs by default and can be revealed only by an explicit Admin choice.
- Customer-facing documents exclude supplier identities, costs, and margins by default.
- A producing mill may appear on a customer document only when explicitly enabled for that transaction.
- Customer, CACO/internal, and supplier/mill item codes are stored separately to avoid accidental disclosure.

## 5. References, Sequences, and Revisions

All references are system-generated, unique, concurrency-safe, and never reused. Annual sequences restart at `001` on January 1. Numeric portions are zero-padded to at least three digits.

| Record | Original reference | Revision or amendment |
| --- | --- | --- |
| Client inquiry | `INQ-2026-001` | `INQ-2026-001-v.01` |
| Supplier RFQ | `RFQ-2026-001-01` | `RFQ-2026-001-01-v.01` |
| Customer quotation | `QT-2026-001` | `QT-2026-001-v.01` |
| Sales contract | `SC-2026-001` | Before signature: `SC-2026-001-v.01`; after signature: `SC-2026-001-A01` |
| Order / operation | `ORD-2026-001` | Commercial amendment: `ORD-2026-001-A01` |

For an RFQ, the first numeric sequence matches its inquiry and the final number is the supplier ordinal. A newly selected supplier receives the next unused ordinal. An ordinal is never reused, and an RFQ revision retains the original supplier ordinal.

Revision invariants:

- Every revision or amendment is linked to its root record and immediate predecessor.
- Exactly one version in a record family is marked `Current`.
- Previous versions remain available in history.
- A sent, accepted, signed, or otherwise finalised version is an immutable snapshot.
- Revising a record never silently changes a downstream document that has already been sent.
- The inquiry becomes locked when the first RFQ based on that inquiry version is sent.
- Drafts are editable. After sending or activation, commercial changes require a revision or amendment.

## 6. Statuses

### 6.1 Client Inquiry

`Draft`, `Sourcing`, `Quoted`, `Won`, `Lost`, `Cancelled`

### 6.2 Supplier RFQ

`Draft`, `Sent`, `Awaiting Response`, `Offer Received`, `Declined`, `Expired`, `Superseded`

`Sent` is recorded as a dispatch event. After successful dispatch, the continuing status is `Awaiting Response`.

### 6.3 Supplier Offer

`Received`, `Under Review`, `Selected`, `Partially Selected`, `Rejected`, `Expired`

### 6.4 Customer Quotation

`Draft`, `Sent`, `Revision Requested`, `Accepted`, `Rejected`, `Expired`, `Superseded`

### 6.5 Sales Contract

`Draft`, `Sent`, `Under Negotiation`, `Signature Pending`, `Signed`, `Cancelled`, `Superseded`

### 6.6 Order / Operation

`Draft`, `Active`, `In Production`, `Ready to Ship`, `Shipped`, `Delivered`, `Completed`, `On Hold`, `Cancelled`

Required transition rules:

- Only an `Accepted` quotation revision can create a sales contract.
- A contract can normally create an order only when it is `Signed`.
- A contract can normally be marked `Signed` only after a signed contract file is uploaded.
- Admin may override a missing signed file or create an order before signature only with a mandatory reason. The record must display `Contract signature pending`.
- Operational progress updates do not create order amendments. A commercial change after order activation creates an order amendment.
- `Lost`, `Declined`, `Rejected`, `Cancelled`, `Superseded`, `On Hold`, outside-tolerance approval, and Admin override actions require a reason.

## 7. Client Inquiry

An inquiry stores:

- Client company and contact.
- Customer reference and received date.
- Original client email and attachments.
- Internal notes.
- One or more structured material lines.
- Technical specifications, tolerances, packing, inspection, certification, documentation, destination, requested Incoterms, and requested timing.

Original emails, spreadsheets, PDFs, drawings, images, and technical documents remain unchanged as evidence. Structured data is used to generate later RFQs, quotations, and contracts.

An inquiry does not require a selling-price column. A customer target price, when supplied, is internal-only.

## 8. Product and Technical Specifications

Common line fields include:

- Product family and product.
- Grade and standard.
- Thickness, width, and length where applicable.
- Quantity and unit.
- Customer, internal, and supplier/mill item codes.

Product-family templates provide applicable additional fields, including coating, colour/RAL, surface treatment, protective film, coil ID/OD, coil weight, packaging, and certification.

Requirements:

- An `Additional Specification` field supports unusual requirements.
- Admin can add product families and specification fields without modifying historical records.
- Every sent RFQ, quotation, and contract stores a specification snapshot.
- Supplier technical and commercial deviations are recorded explicitly, not hidden only in notes.

## 9. Supplier RFQs and Offers

### 9.1 Supplier RFQ

- Created from selected lines of the current inquiry version.
- Sent to one or more selected contacts belonging to one supplier company.
- Includes an RFQ PDF, editable pricing workbook, and optional supporting documents.
- Uses an editable response deadline; the default is seven days.
- Records send result and activity history independently for every supplier.

### 9.2 Incoming supplier response

- Replies arrive in the normal Google Workspace inbox.
- An internal user records `Offer Received` and uploads the supplier's offer or email PDF to the matching RFQ.
- V1 does not read or automatically match incoming Gmail messages.

### 9.3 Supplier Offer

An offer records:

- Supplier offer reference and date.
- Connected RFQ and inquiry version.
- Line-level price or `Not Offered`.
- Currency.
- Incoterm, named place/port, and Incoterms edition.
- Payment terms.
- Production or shipment readiness.
- Validity.
- MOQ and quantity tolerance.
- Origin and producing mill.
- Packing, inspection, and documentation conditions.
- Technical and commercial deviations.
- Original supplier quotation file.
- Alternative offers such as FOB, CFR, and CIF with separate prices and conditions.

## 10. Internal Costing and Customer Price

Internal costs can be entered as:

- Amount per metric ton.
- Fixed total amount.
- Percentage of material value.

Cost categories include freight, insurance, inspection, banking, financing, commission, handling, and additional internal charges. The system calculates landed cost per MT and total landed cost.

Margin can be entered as an amount per MT or a percentage. Cost and margin information is confidential.

USD is the default currency. V1 has no exchange-rate calculation. A single inquiry-to-quotation chain must use one currency, even when another currency is selected.

## 11. Customer Quotation

- Created from the inquiry specification and selected supplier offer/costing lines.
- Different lines may use different suppliers internally.
- Contains customer-facing specifications, quantities, prices, commercial terms, validity, and selected public mill/origin information.
- Is emailed as a generated PDF.
- Customer acceptance, rejection, or revision request is received outside the platform and recorded manually.
- Acceptance evidence may be an email PDF, purchase order, or signed quotation attachment.
- A sent quotation is locked; requested changes create a new quotation revision.

## 12. Sales Contract

A generated contract PDF contains:

1. Commercial summary: parties, references, value, currency, payment, shipment, Incoterm, ports, and dates.
2. Material schedule: grade, standard, dimensions, coating, quantities, tolerances, prices, and amounts.
3. The exact version of the CACO General Conditions used for the contract.

Contract requirements:

- The contract permanently references its accepted source quotation revision.
- Pre-signature negotiation changes create `v.01`, `v.02`, and later revisions.
- Post-signature commercial changes create `A01`, `A02`, and later amendments.
- The signed PDF or scanned copy is stored with upload date, uploader, and original filename.
- A signed file is never silently replaced; a corrected copy becomes a new document version.
- Signed versions remain permanently available.

General Conditions requirements:

- V1 uses one English template.
- Only Admin can create a new version.
- A version used by a sent contract cannot be edited or deleted.
- Each contract permanently stores the version used.
- Final legal wording must be reviewed by a qualified international-trade lawyer before live contract issuance.

## 13. Order and Operation

An order normally copies the final customer, materials, quantities, prices, payment, and shipment terms from the signed contract. Draft orders are editable; orders lock when activated.

Operational updates include production, readiness, shipment, delivery, payment, and document progress. These updates do not create commercial amendments.

## 14. Quantity Tolerances and Weight

Each contract line stores:

- Contract quantity.
- Separate minus and plus tolerance.
- Tolerance mode: percentage or MT.
- Optional total-contract minus and plus tolerance.

Both line tolerance and total-contract tolerance are validated independently. A quantity outside either tolerance cannot be finalised without an Admin override and reason.

Applicable packing/loading fields include:

- Number of pieces, bundles, or coils.
- Pieces per bundle.
- Optional individual bundle or coil IDs.
- Theoretical unit weight.
- Total theoretical weight.
- Actual net weight.
- Actual gross weight.
- Difference between theoretical and actual weight.

Packing fields are mandatory only when applicable to the selected product and packing type.

Theoretical weight may be calculated automatically only when a configured product formula exists. An authorised user may correct it with a mandatory explanation.

Default precision:

- Weight and MT quantities: three decimal places.
- Unit prices and monetary amounts: two decimal places.
- Available quantity units: MT, kg, pieces, coils, and bundles.

## 15. Loading and Shipment

The supported shipment methods are:

- Container.
- Breakbulk vessel.
- Truck.
- Rail.
- **RO-RO**, including shipments used for Italy.
- Other.

Shipment records store fields relevant to the method:

- Container and seal number.
- Vessel and voyage.
- Truck, trailer, and registration/plate.
- Rail wagon.
- RO-RO vessel and vehicle/trailer details.
- Loading date.
- Packing marks and notes.
- Loading and discharge ports/places.
- Partial-shipment and transshipment permissions.
- Origin, mill, and readiness details.

Every commercial shipment term records the exact Incoterm, named port/place, and edition, for example `CFR Montevideo Port, Incoterms 2020`.

Loading allocations are many-to-many:

- One contract item can be split across several containers, conveyances, or shipments.
- One container, conveyance, or shipment can contain several contract items.
- Totals are calculated from loading allocations without duplicating quantity.

## 16. Invoicing and Payments

The contract has a default invoice basis, with an optional override per product line:

- Actual net weight.
- Theoretical weight.
- Pieces/units.

The advance due is calculated from the sales contract amount. Final invoice quantity and value are calculated from completed loading records and the agreed invoice basis.

Example:

- Contract: 30.000 MT at USD 700/MT = USD 21,000.00.
- Advance: 20% = USD 4,200.00.
- Actual invoice quantity: 28.900 MT.
- Final invoice: USD 20,230.00.
- Remaining balance before other adjustments/payments: USD 16,030.00.

Payment terms store:

- Advance-payment percentage.
- Balance-payment percentage.
- Balance trigger, such as before shipment, against documents, or after delivery.
- Method, such as bank transfer, letter of credit, CAD, or approved alternative.
- Additional notes.

Where percentage terms are used, advance and balance percentages must total 100%.

Multiple payment records are supported, each with amount, date, bank reference, and attachment. Seller bank accounts are maintained by Admin and selected from a dropdown.

The final balance is:

```text
Final invoiced value
+ approved document charges, tax, and positive adjustments
- credits and negative adjustments
- all payments received
= remaining balance
```

Line amounts are calculated from the three-decimal invoice quantity multiplied by the two-decimal unit price, rounded to two decimals, and document totals sum the rounded line amounts.

Partial shipments and invoices are one-to-many under an order. Each invoice is based on its shipment's quantities. Contract-level advance payments can be allocated across invoices, but the system must prevent over-allocation.

Export tax defaults to zero. Optional tax, freight, insurance, inspection, banking, or other document charges may be added when applicable.

## 17. Document Set

### 17.1 System-generated documents

- Supplier RFQ PDF.
- Editable supplier pricing workbook.
- Customer quotation PDF.
- Sales contract PDF.
- Proforma invoice.
- Final commercial invoice.
- Packing list.

### 17.2 Uploaded documents

- Original inquiry emails and files.
- Supplier offers.
- Customer acceptance evidence.
- Signed contracts and corrected signed-file versions.
- Bills of lading.
- CMRs.
- Certificates of origin.
- Mill test certificates.
- Inspection certificates.
- Insurance documents.
- Customs documents.
- Additional Admin-configured document categories.

Sent/generated documents and original evidence files are immutable and versioned. Normal users cannot permanently delete them.

CACO Steel is the only enabled legal seller in V1. Its logo, legal name, address, tax details, bank accounts, and numbering settings are used for generated documents. The data model should permit additional legal sellers later without exposing that configuration in V1.

## 18. Alerts

V1 provides informational dashboard alerts for:

- RFQs awaiting supplier response.
- Supplier offers approaching expiry.
- Customer quotations approaching expiry.
- Contracts awaiting customer signature.
- Signed contracts not converted to orders.
- Approaching payment or shipment dates.

Alerts do not assign tasks or create a task-management workflow.

## 19. Audit and Soft Deletion

The audit history records the actor, timestamp, record/version, and action for:

- Creation and editing.
- Email preview and sending result.
- Revision and amendment.
- Supplier-offer receipt and selection.
- Quotation acceptance/rejection.
- Contract signing and overrides.
- Conversion between workflow stages.
- Loading, invoice, payment, and document actions.
- Deletion request, approval, rejection, and restoration.

Records are never permanently deleted in normal operation. A user requests deletion, and Admin approves or rejects a soft deletion. Historical references and audit events remain intact.

## 20. V1 Acceptance Criteria

V1 is accepted when:

1. The system can create unique annual references and immutable revisions for every workflow stage.
2. One inquiry can generate independently tracked RFQs for multiple suppliers.
3. Every selected supplier receives a separate email and cannot discover other suppliers.
4. Supplier responses can be recorded line by line, including alternatives, deviations, and original files.
5. Internal costs and margins calculate correctly and are inaccessible to customer users.
6. A quotation can select different suppliers per line without exposing them to the customer.
7. Sent records are locked and changes create traceable revisions.
8. Only an accepted quotation can create a contract, and normally only a signed contract can create an order.
9. Signed files and General Conditions versions are retained immutably.
10. Line and total tolerances are validated against accumulated loading quantities.
11. Loading supports container, breakbulk, truck, rail, RO-RO, and Other shipments.
12. Loading allocations correctly support many items per conveyance and one item across many conveyances.
13. Actual, theoretical, or piece-based invoice quantities calculate correctly per line.
14. Advance, partial shipment invoices, adjustments, payments, and final balance reconcile without double counting.
15. Required customer, supplier, contract, shipping, invoice, and compliance documents can be generated or uploaded and versioned.
16. Roles, confidentiality rules, audit history, reasons, overrides, and soft deletion behave as specified.
17. The production build passes its automated type, lint, and application tests.

## 21. Explicit V2 Exclusions

The following are outside V1 scope:

- Supplier platform accounts or a supplier portal.
- Automatic Gmail inbox reading, parsing, or reply-to-RFQ matching.
- Online customer acceptance, electronic signatures, or e-signature-provider integration.
- Live currency exchange rates and automatic currency conversion.
- Automated OCR or AI extraction from inquiry, supplier-offer, contract, or shipping files.
- Task assignment, workflow queues, staff calendars, or a task-management module.
- Automatic reminders sent without a user action.
- Advanced configurable permission matrices beyond the approved V1 role/access rules.
- Multiple enabled legal selling companies in the interface.
- Automatic integration with mills, freight forwarders, carriers, banks, customs, or accounting systems.
- Advanced production planning, warehouse management, or logistics optimisation.
- Multi-language user interface or generated documents.
