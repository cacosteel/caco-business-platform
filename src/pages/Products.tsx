import { useProducts } from "../../hooks/useProducts";
import {
  createProduct,
  deleteProduct,
} from "../../services/productService";
import ProductForm from "../../components/products/ProductForm";
import ProductTable from "../../components/products/ProductTable";

export default function Products() {
  const { products, loading, refresh } = useProducts();

  async function addProduct(data: {
    code: string;
    name: string;
    category: string;
    description: string;
    unit: string;
    unit_price: number;
    currency: string;
    is_active: boolean;
  }) {
    await createProduct(data);
    refresh();
  }

  async function removeProduct(id: string) {
    await deleteProduct(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Products</h1>

      <ProductForm onSave={addProduct} />

      <p>Total Products: {products.length}</p>

      <ProductTable
        products={products}
        onDelete={removeProduct}
      />
    </>
  );
}