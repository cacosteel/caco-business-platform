import { useCompanies } from "../../hooks/useCompanies";
import { useContacts } from "../../hooks/useContacts";
import { useProducts } from "../../hooks/useProducts";
import { useInquiries } from "../../hooks/useInquiries";
import { useQuotations } from "../../hooks/useQuotations";
import { useOrders } from "../../hooks/useOrders";
import { useDocuments } from "../../hooks/useDocuments";

export default function DashboardHome() {
  const { companies } = useCompanies();
  const { contacts } = useContacts();
  const { products } = useProducts();
  const { inquiries } = useInquiries();
  const { quotations } = useQuotations();
  const { orders } = useOrders();
  const { documents } = useDocuments();

  return (
    <>
      <h1>Dashboard</h1>

      <table border={1} cellPadding={12}>
        <tbody>
          <tr>
            <td>Companies</td>
            <td>{companies.length}</td>
          </tr>

          <tr>
            <td>Contacts</td>
            <td>{contacts.length}</td>
          </tr>

          <tr>
            <td>Products</td>
            <td>{products.length}</td>
          </tr>

          <tr>
            <td>Inquiries</td>
            <td>{inquiries.length}</td>
          </tr>

          <tr>
            <td>Quotations</td>
            <td>{quotations.length}</td>
          </tr>

          <tr>
            <td>Orders</td>
            <td>{orders.length}</td>
          </tr>

          <tr>
            <td>Documents</td>
            <td>{documents.length}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}