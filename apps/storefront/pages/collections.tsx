
import { Link, useParams } from "react-router-dom";

const COLLECTIONS = [
  {
    handle: "tops",
    title: "Tops",
    description: "Crew necks, hoodies, polos — refined silhouettes in muted tones.",
    image: "https://picsum.photos/seed/tops1/600/400",
    count: 18,
    color: "#7c6aff",
  },
  {
    handle: "bottoms",
    title: "Bottoms",
    description: "Cargo pants, joggers, denim — built for movement without compromise.",
    image: "https://picsum.photos/seed/bottoms2/600/400",
    count: 12,
    color: "#3ddc97",
  },
  {
    handle: "outerwear",
    title: "Outerwear",
    description: "Bombers, trench coats, windbreakers — your outer layer, perfected.",
    image: "https://picsum.photos/seed/outer3/600/400",
    count: 9,
    color: "#f5a623",
  },
  {
    handle: "accessories",
    title: "Accessories",
    description: "Hats, bags, socks — the details that complete the look.",
    image: "https://picsum.photos/seed/acc4/600/400",
    count: 14,
    color: "#ff5c5c",
  },
];

export default function CollectionsPage() {
  const { handle } = useParams<{ handle?: string }>();

  
  const active = handle ? COLLECTIONS.find((c) => c.handle === handle) : null;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>{active ? active.title : "All Collections"}</h1>
        <p style={s.sub}>
          {active ? active.description : "Browse our curated categories of minimal, functional clothing."}
        </p>
      </div>

      <div style={s.grid}>
        {(active ? [active] : COLLECTIONS).map((col) => (
          <Link key={col.handle} to={`/?category=${col.title}`} style={s.card}>
            <div style={s.imgWrap}>
              <img src={col.image} alt={col.title} style={s.img}
                onError={(e: any) => { e.target.src = "https://placehold.co/600x400?text=" + col.title; }} />
              <div style={{ ...s.overlay, background: `${col.color}22` }} />
            </div>
            <div style={s.cardBody}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h2 style={s.cardTitle}>{col.title}</h2>
                <span style={{ ...s.count, color: col.color, borderColor: col.color }}>{col.count} pieces</span>
              </div>
              <p style={s.cardDesc}>{col.description}</p>
              <span style={{ ...s.shopLink, color: col.color }}>Shop {col.title} →</span>
            </div>
          </Link>
        ))}
      </div>

      {!active && (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <Link to="/" style={s.allBtn}>View All Products →</Link>
        </div>
      )}
    </div>
  );
}

const s: Record<string, any> = {
  page:     { maxWidth: 1100, margin: "0 auto", padding: "48px 24px 100px" },
  header:   { marginBottom: 48, maxWidth: 600 },
  title:    { fontSize: 40, fontWeight: 800, marginBottom: 12 },
  sub:      { color: "#aaa", fontSize: 16, lineHeight: 1.7 },
  grid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(480px,1fr))", gap: 24 },
  card:     { textDecoration: "none", color: "inherit", background: "#141417", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a31", transition: "border-color 0.2s, transform 0.2s", display: "block" },
  imgWrap:  { position: "relative", aspectRatio: "3/2", overflow: "hidden" },
  img:      { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" },
  overlay:  { position: "absolute", inset: 0 },
  cardBody: { padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8 },
  cardDesc: { color: "#888", fontSize: 14, lineHeight: 1.6, marginBottom: 12 },
  count:    { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid", flexShrink: 0 },
  shopLink: { fontSize: 14, fontWeight: 700 },
  allBtn:   { display: "inline-block", padding: "14px 32px", background: "#7c6aff", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700 },
};