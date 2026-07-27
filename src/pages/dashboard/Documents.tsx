import { useDocuments } from "../../hooks/useDocuments";
import {
  createDocument,
  deleteDocument,
} from "../../services/documentService";
import DocumentForm from "../../components/documents/DocumentForm";
import DocumentTable from "../../components/documents/DocumentTable";

export default function Documents() {
  const { documents, loading, refresh } = useDocuments();

  async function addDocument(data: {
    company_id: string;
    inquiry_id: string | null;
    quotation_id: string | null;
    order_id: string | null;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
  }) {
    await createDocument(data);
    refresh();
  }

  async function removeDocument(id: string) {
    await deleteDocument(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Documents</h1>

      <DocumentForm onSave={addDocument} />

      <p>Total Documents: {documents.length}</p>

      <DocumentTable
        documents={documents}
        onDelete={removeDocument}
      />
    </>
  );
}