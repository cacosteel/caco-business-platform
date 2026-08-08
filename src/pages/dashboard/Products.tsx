import { useState } from "react";
import { Button, Group, Title } from "@mantine/core";
import { useProducts } from "../../hooks/useProducts";
import { deleteProduct } from "../../services/productService";
import ProductForm from "../../components/products/ProductForm";
import ProductTable from "../../components/products/ProductTable";
import type { product } from "../../types/product";

export default function Products() {
  const { products, loading, refresh } = useProducts();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<product>();
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    if (window.confirm("Delete this product?")) { await deleteProduct(id); await refresh(); }
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <Group justify="space-between" mb="md"><Title order={1}>Products</Title><Button onClick={() => setOpened(true)}>Add product</Button></Group>
    <ProductTable products={products} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <ProductForm opened={opened} product={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
