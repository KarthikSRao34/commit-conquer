

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCartDispatch } from "../Layout";
import CartDrawer from "../CartDrawer";

const API = "/api/v1/store";

async function fetchProduct(handle: string) {
  
  try {
    const res = await fetch(`${API}/products/handle/${handle}`);
    if (res.ok) {
      const data = await res.json();
      return data.product;
    }
  } catch {}
  
  return {
    id: `prod_demo`,
    handle,
    title: handle.replace(/-\d+$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Premium quality streetwear built for people who move with purpose. No logos, no excess — just craft. Garment-dyed for a lived-in feel, pre-washed for immediate comfort.",
    category: "Tops",
    status: "published",
    images: [
      { url: `https://picsum.photos/seed/${handle}1/600/750`, alt: "Front" },
      { url: `https://picsum.photos/seed/${handle}2/600/750`, alt: "Back" },
      { url: `https://picsum.photos/seed/${handle}3/600/750`, alt: "Detail" },
    ],
    thumbnail: `https://picsum.photos/seed/${handle}1/600/750`,
    price: 7900,
    variants: [
      { id: "var_s",  title: "S",  inventory: 5 },
      { id: "var_m",  title: "M",  inventory: 12 },
      { id: "var_l",  title: "L",  inventory: 8 },
      { id: "var_xl", title: "XL", inventory: 0 },
    ],
    tags: ["new"],
    rating: 4.6,
    reviewCount: 38,
  };
}

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const dispatch   = useCartDispatch() as any;
  const navigate   = useNavigate();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProduct(handle!),
    enabled: !!handle,
  });

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [imgIdx, setImgIdx]     = useState(0);
  const [toast, setToast]       = useState<string | null>(null);
  const [qty, setQty]           = useState(1);

  const addToCart = () => {
    if (!product) return;
    const variant = product.variants?.find((v: any) => v.id === selectedVariant) ?? product.variants?.[0];
    dispatch.addItem({
      id:        product.id,
      variantId: variant?.id ?? "default",
      title:     product.title,
      price:     product.price ?? 0, // Send as cents
      thumbnail: product.thumbnail,
      size:      variant?.title,
      quantity:  qty,
    });
    dispatch.toggleCart(true);
    setToast("Added to cart!");
    setTimeout(() => setToast(null), 2500);
  };

  if (isLoading) return <div style={s.loader}>Loading…</div>;
  if (error || !product) return (
    <div style={s.loader}>
      Product not found. <Link to="/" style={{ color: "#7c6aff" }}>← Back to shop</Link>
    </div>
  );

  const images = product.images?.length ? product.images : [{ url: product.thumbnail, alt: product.title }];
  const price  = (product.price ?? 0) / 100;
  const variant = product.variants?.find((v: any) => v.id === selectedVariant) ?? null;
  const inStock = variant ? variant.inventory > 0 : true;

  return (
    <div style={s.page}>
      <style>{css}</style>

      
      <nav style={s.breadcrumb}>
        <Link to="/" style={s.bcLink}>Shop</Link>
        <span style={{ color: "#555" }}>›</span>
        <Link to="/collections" style={s.bcLink}>{product.category}</Link>
        <span style={{ color: "#555" }}>›</span>
        <span style={{ color: "#aaa" }}>{product.title}</span>
      </nav>

      <div style={s.layout}>
        {/* ── Images ── */}
        <div style={s.imageSection}>
          <div style={s.mainImage}>
            <img src={images[imgIdx]?.url} alt={images[imgIdx]?.alt} style={s.mainImg}
              onError={(e: any) => { e.target.src = "https://placehold.co/600x750?text=No+Image"; }} />
          </div>
          {images.length > 1 && (
            <div style={s.thumbRow}>
              {images.map((img: any, i: number) => (
                <button key={i} onClick={() => setImgIdx(i)} style={{
                  ...s.thumbBtn,
                  border: imgIdx === i ? "2px solid #7c6aff" : "2px solid #2a2a31",
                }}>
                  <img src={img.url} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e: any) => { e.target.src = "https://placehold.co/80x96?text=img"; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        
        <div style={s.info}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {product.tags?.map((t: string) => (
              <span key={t} style={s.tag}>{t}</span>
            ))}
          </div>
          <h1 style={s.title}>{product.title}</h1>

          <div style={s.ratingRow}>
            {"★".repeat(Math.round(product.rating ?? 0))}{"☆".repeat(5 - Math.round(product.rating ?? 0))}
            <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>
              {product.rating?.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>

          <div style={s.price}>${price.toFixed(2)}</div>

          <p style={s.desc}>{product.description}</p>

          
          {product.variants?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={s.label}>Size</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {product.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    disabled={v.inventory === 0}
                    style={{
                      ...s.sizeBtn,
                      border: selectedVariant === v.id ? "2px solid #7c6aff" : "2px solid #2a2a31",
                      opacity: v.inventory === 0 ? 0.4 : 1,
                    }}
                  >
                    {v.title}
                    {v.inventory === 0 && <span style={{ display: "block", fontSize: 9, color: "#888" }}>Out</span>}
                  </button>
                ))}
              </div>
              {selectedVariant && variant?.inventory > 0 && (
                <p style={{ color: "#3ddc97", fontSize: 13, marginTop: 8 }}>✓ {variant.inventory} in stock</p>
              )}
            </div>
          )}

          
          <div style={{ marginBottom: 24 }}>
            <p style={s.label}>Quantity</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button style={s.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span style={{ fontSize: 18, fontWeight: 700, minWidth: 30, textAlign: "center" }}>{qty}</span>
              <button style={s.qtyBtn} onClick={() => setQty(qty + 1)}>+</button>
            </div>
          </div>

          
          <button
            onClick={addToCart}
            disabled={!inStock}
            style={{ ...s.addBtn, opacity: !inStock ? 0.5 : 1, cursor: !inStock ? "not-allowed" : "pointer" }}
          >
            {inStock ? "Add to Cart" : "Out of Stock"}
          </button>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={() => { addToCart(); navigate("/checkout"); }} style={s.buyNowBtn}>
              Buy Now
            </button>
          </div>

          <div style={s.features}>
            {["Free shipping over $100", "30-day returns", "Garment-dyed finish"].map((f) => (
              <div key={f} style={s.featureRow}>
                <span style={{ color: "#3ddc97" }}>✓</span>
                <span style={{ color: "#aaa", fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CartDrawer />

      {toast && (
        <div style={s.toast}>✓ {toast}</div>
      )}
    </div>
  );
}

const css = `
  @media (max-width: 768px) {
    .pd-layout { flex-direction: column !important; }
    .pd-image-section { width: 100% !important; }
  }
`;

const s: Record<string, any> = {
  page:       { maxWidth: 1100, margin: "0 auto", padding: "24px 24px 60px" },
  loader:     { padding: 60, textAlign: "center", color: "#888" },
  breadcrumb: { display: "flex", gap: 10, alignItems: "center", marginBottom: 32, fontSize: 14 },
  bcLink:     { color: "#7c6aff", textDecoration: "none" },
  layout:     { display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" },
  imageSection: { flex: "0 0 480px", maxWidth: "100%" },
  mainImage:  { borderRadius: 16, overflow: "hidden", background: "#141417", aspectRatio: "4/5", marginBottom: 12 },
  mainImg:    { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  thumbRow:   { display: "flex", gap: 8 },
  thumbBtn:   { width: 72, height: 88, borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#141417", flexShrink: 0 },
  info:       { flex: 1, minWidth: 280 },
  tag:        { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(124,106,255,0.15)", color: "#7c6aff", textTransform: "uppercase" },
  title:      { fontSize: 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 },
  ratingRow:  { color: "#f5a623", fontSize: 18, marginBottom: 12, display: "flex", alignItems: "center" },
  price:      { fontSize: 28, fontWeight: 800, color: "#7c6aff", marginBottom: 20 },
  desc:       { color: "#aaa", fontSize: 15, lineHeight: 1.7, marginBottom: 28 },
  label:      { fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  sizeBtn:    { padding: "10px 16px", background: "#141417", color: "#e8e8f0", cursor: "pointer", borderRadius: 8, fontSize: 14, fontWeight: 600, minWidth: 52, textAlign: "center" },
  qtyBtn:     { width: 36, height: 36, border: "1px solid #2a2a31", background: "#1c1c21", color: "#e8e8f0", cursor: "pointer", borderRadius: 8, fontSize: 18 },
  addBtn:     { width: "100%", padding: "16px", background: "#7c6aff", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700 },
  buyNowBtn:  { flex: 1, padding: "14px", background: "#1c1c21", color: "#e8e8f0", border: "1px solid #2a2a31", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  features:   { marginTop: 28, display: "flex", flexDirection: "column", gap: 10 },
  featureRow: { display: "flex", gap: 10, alignItems: "center" },
  toast:      { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#3ddc97", color: "#0c0c0e", padding: "12px 24px", borderRadius: 10, fontWeight: 700, zIndex: 999, fontSize: 14 },
};