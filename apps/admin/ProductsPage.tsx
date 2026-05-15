import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

// Mock fetch function for products
const fetchProducts = async ({ pageParam = 1, queryKey }: any) => {
  const [_key, filters] = queryKey;
  const response = await fetch(`/api/products?page=${pageParam}&category=${filters.category}`);
  return response.json();
};

export default function ProductsPage() {
  const [category, setCategory] = useState("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products", { category }],
    queryFn: fetchProducts,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  return (
    <div style={{ padding: 24 }}>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      {/* Product list rendering logic */}
      <div>
        {data?.pages.map((page, i) => (
          <div key={i}>
            {page.products.map((p: any) => <div key={p.id}>{p.name}</div>)}
          </div>
        ))}
      </div>

      <button 
        onClick={() => fetchNextPage()} 
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? "Loading..." : "Load More"}
      </button>
    </div>
  );
}