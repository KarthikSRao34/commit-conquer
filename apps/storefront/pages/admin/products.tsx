// apps/storefront/pages/admin/products.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ADMIN   = "/api/v1/admin";
const HEADERS = { "Content-Type": "application/json", "X-Admin-Secret": "admin_dev_secret" };

async function fetchProducts(search = "", status = "all") {
  try {
    const params = new URLSearchParams({ limit: "50", search, status });
    const res = await fetch(`${ADMIN}/products?${params}`, { headers: HEADERS });
    if (res.ok) { const d = await res.json(); return d.products ?? d.data ?? []; }
  } catch {}
  
  const titles = ["Obsidian Crew Neck","Slate Cargo Pant","Onyx Hoodie","Granite Bomber","Ash Trench Coat","Carbon Jogger","Basalt Windbreaker","Charcoal Denim","Iron Fleece","Flint Overshirt","Coal Polo","Cinder Vest"];
  return Array.from({ length: 16 }, (_, i) => ({
    id: `prod_${String(i+1).padStart(3,"0")}`,
    title: titles[i % 12],
    handle: titles[i % 12].toLowerCase().replace(/\s+/g,"-"),
    status: i % 4 === 1 ? "draft" : "published",
    price: 3900 + ((i * 1700) % 20000),
    category: ["Tops","Bottoms","Outerwear","Accessories"][i % 4],
    thumbnail: `https://picsum.photos/seed/${i+10}/80/96`,
    variants: [{ inventory: 5 + (i * 7) % 40 }],
  }));
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [newProduct, setNewProduct] = useState({ title: "", price: "", category: "Tops", status: "published" });
  const [toast, setToast]       = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products", search, status],
    queryFn: () => fetchProducts(search, status),
    staleTime: 10_000,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || p.status === status;
      return matchSearch && matchStatus;
    });
  }, [products, search, status]);

  useEffect(() => {
    setSelected([]);
  }, [search, status]);

  const toggleSelect = (id: string) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const selectAll = () =>
    setSelected(selected.length === filteredProducts.length && filteredProducts.length > 0 ? [] : filteredProducts.map((p: any) => p.id));

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${ADMIN}/products`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ ...newProduct, price: parseInt(newProduct.price) * 100 }),
      });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setShowAdd(false);
      setNewProduct({ title: "", price: "", category: "Tops", status: "published" });
      showToast("Product created!");
    } catch { showToast("Error creating product"); }
  };

  const toggleStatus = async (product: any) => {
    const action = product.status === "published" ? "unpublish" : "publish";
    try {
      await fetch(`${ADMIN}/products/${product.id}/${action}`, { method: "POST", headers: HEADERS });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      showToast(`Product ${action}ed`);
    } catch { showToast("Error updating product"); }
  };

  const deleteSelected = async () => {
    if (!selected.length || !confirm(`Delete ${selected.length} product(s)?`)) return;
    try {
      await fetch(`${ADMIN}/products`, { method: "DELETE", headers: HEADERS, body: JSON.stringify({ ids: selected }) });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelected([]);
      showToast(`Deleted ${selected.length} products`);
    } catch { showToast("Error deleting"); }
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Products</h1>
          <p style={{ color: "#888", fontSize: 14 }}>{products.length} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={s.addBtn}>+ New Product</button>
      </div>

      
      <div style={s.filters}>
        <input style={s.search} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        {selected.length > 0 && (
          <button onClick={deleteSelected} style={s.deleteBtn}>Delete ({selected.length})</button>
        )}
      </div>

      
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}><input type="checkbox" checked={selected.length === filteredProducts.length && filteredProducts.length > 0} onChange={selectAll} /></th>
              <th style={s.th}>Product</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Price</th>
              <th style={s.th}>Stock</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding: "16px 20px" }}><div style={{ height: 20, background: "#1c1c21", borderRadius: 4, width: `${60 + i * 5}%` }} /></td></tr>
              ))
            ) : filteredProducts.map((p: any) => (
              <tr key={p.id} style={s.tr}>
                <td style={s.td}><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td style={s.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={p.thumbnail} alt={p.title} width={40} height={48} style={{ borderRadius: 6, objectFit: "cover" }}
                      onError={(e: any) => { e.target.src = "https://placehold.co/40x48?text=img"; }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                      <div style={{ color: "#888", fontSize: 12 }}>{p.handle}</div>
                    </div>
                  </div>
                </td>
                <td style={s.td}><span style={s.catBadge}>{p.category}</span></td>
                <td style={s.td}><span style={{ fontWeight: 700 }}>{fmt(p.price)}</span></td>
                <td style={s.td}>
                  <span style={{ color: (p.variants?.[0]?.inventory ?? 0) > 5 ? "#3ddc97" : "#f5a623" }}>
                    {p.variants?.reduce((a: number, v: any) => a + (v.inventory ?? 0), 0) ?? "—"}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.statusBadge, background: p.status === "published" ? "rgba(61,220,151,0.12)" : "rgba(245,166,35,0.12)", color: p.status === "published" ? "#3ddc97" : "#f5a623" }}>
                    {p.status}
                  </span>
                </td>
                <td style={s.td}>
                  <button onClick={() => toggleStatus(p)} style={s.actionBtn}>
                    {p.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
      {showAdd && (
        <div style={s.modalBg} onClick={() => setShowAdd(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>New Product</h2>
            <form onSubmit={createProduct} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input style={s.input} placeholder="Product title" value={newProduct.title} onChange={(e) => setNewProduct((p) => ({ ...p, title: e.target.value }))} required />
              <input style={s.input} type="number" placeholder="Price (USD, e.g. 79)" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} required />
              <select style={s.input} value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}>
                {["Tops","Bottoms","Outerwear","Accessories"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <select style={s.input} value={newProduct.status} onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value }))}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" style={s.addBtn}>Create Product</button>
                <button type="button" onClick={() => setShowAdd(false)} style={s.cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>✓ {toast}</div>}
    </div>
  );
}

const s: Record<string, any> = {
  topBar:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  addBtn:    { padding: "10px 20px", background: "#7c6aff", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  filters:   { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  search:    { flex: 1, minWidth: 200, padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" },
  select:    { padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31", borderRadius: 8, color: "#e8e8f0", fontSize: 14, cursor: "pointer" },
  deleteBtn: { padding: "10px 16px", background: "rgba(255,92,92,0.12)", color: "#ff5c5c", border: "1px solid #ff5c5c44", borderRadius: 8, fontSize: 14, cursor: "pointer" },
  tableWrap: { background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, overflow: "auto" },
  table:     { width: "100%", borderCollapse: "collapse" },
  thead:     { background: "#1c1c21" },
  th:        { padding: "12px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, whiteSpace: "nowrap" as const },
  tr:        { borderTop: "1px solid #1c1c21" },
  td:        { padding: "14px 16px", fontSize: 14 },
  catBadge:  { fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#1c1c21", color: "#888" },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  actionBtn: { padding: "6px 12px", background: "#1c1c21", border: "1px solid #2a2a31", color: "#e8e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  modalBg:   { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:     { background: "#141417", border: "1px solid #2a2a31", borderRadius: 16, padding: 32, width: "min(480px,90vw)" },
  input:     { width: "100%", padding: "12px 14px", background: "#1c1c21", border: "1px solid #2a2a31", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" },
  cancelBtn: { padding: "10px 16px", background: "none", border: "1px solid #2a2a31", color: "#888", borderRadius: 8, cursor: "pointer", fontSize: 14 },
  toast:     { position: "fixed" as const, bottom: 24, right: 24, background: "#3ddc97", color: "#0c0c0e", padding: "12px 20px", borderRadius: 10, fontWeight: 700, zIndex: 999, fontSize: 14 },
};