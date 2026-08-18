import type { product } from "../../types/product";

type Props = {
  products: product[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (product: product) => void;
};

export default function ProductTable({
  products,
  onDelete,
  onEdit,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Description</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.code}</td>
            <td>{product.name}</td>
            <td>{product.category}</td>
            <td>{product.description || "—"}</td>
            <td>{product.is_active ? "Active" : "Inactive"}</td>
            <td>
              <button onClick={() => onEdit(product)}>Edit</button>{" "}
              <button onClick={() => onDelete(product.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
