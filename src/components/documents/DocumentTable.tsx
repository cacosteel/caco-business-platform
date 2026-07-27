import type { document } from "../../types/document";

type Props = {
  documents: document[];
  onDelete: (id: string) => Promise<void>;
};

export default function DocumentTable({
  documents,
  onDelete,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>File Name</th>
          <th>MIME Type</th>
          <th>Size</th>
          <th>Uploaded</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {documents.map((document) => (
          <tr key={document.id}>
            <td>{document.file_name}</td>
            <td>{document.mime_type}</td>
            <td>{document.file_size}</td>
            <td>{document.uploaded_at}</td>
            <td>
              <button onClick={() => onDelete(document.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}