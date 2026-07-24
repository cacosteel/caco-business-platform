import type { product } from "../../types/product";

type Props = {
  products: product[];
  onDelete: (id: string) => Promise<void>;
};

export default function ProductTable({
  products,
  onDelete,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Unit</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.code}</td>
            <td>{product.name}</td>
            <td>{product.category}</td>
            <td>{product.unit}</td>
            <td>
              {product.unit_price} {product.currency}
            </td>
            <td>
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