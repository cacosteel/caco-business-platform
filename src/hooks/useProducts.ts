import { useEffect, useState } from "react";
import { getProducts } from "../services/productService";
import type { product } from "../types/product";

export function useProducts() {
  const [products, setProducts] = useState<product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    try {
      const data = await getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    products,
    loading,
    refresh: loadProducts,
  };
}