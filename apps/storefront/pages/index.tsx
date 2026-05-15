

import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCartState, useCartDispatch } from "../Layout";
import CartDrawer from "../CartDrawer";


interface Product {
  id: string;
  handle: string;
  title: string;
  category: string;
  status: "published" | "draft";
  thumbnail: string;
  price: number;         
  originalPrice?: number;
  inventory: number;
  tags: string[];
  rating: number;
  reviewCount: number;
}

interface FetchResult {
  products: Product[];
  nextPage: number | undefined;
  total: number;
}


const PRODUCT_DATA: Product[] = Array.from({ length: 60 }, (_, i) => {
  const titles = [
    "Obsidian Crew Neck", "Slate Cargo Pant", "Onyx Hoodie", "Granite Bomber",
    "Ash Trench Coat", "Carbon Jogger", "Basalt Windbreaker", "Charcoal Denim",
    "Iron Fleece", "Flint Overshirt", "Coal Polo", "Cinder Vest",
  ];
  const categories = ["Tops", "Bottoms", "Outerwear", "Accessories"];
  const tags = [["new"], ["sale"], [], ["bestseller"], ["limited"]][i % 5];
  const price = parseFloat((29 + ((i * 17) % 200)).toFixed(2));
  return {
    id: `prod_${String(i + 1).padStart(3, "0")}`,
    handle: titles[i % 12].toLowerCase().replace(/\s+/g, "-") + `-${i + 1}`,
    title: titles[i % 12],
    category: categories[i % 4],
    status: (i % 5 === 1 ? "draft" : "published") as "published" | "draft",
    thumbnail: `https://picsum.photos/seed/${i + 10}/400/500`,
    price,
    originalPrice: tags.includes("sale") ? parseFloat((price * 1.3).toFixed(2)) : undefined,
    inventory: 200 - ((i * 13) % 180),
    tags,
    rating: parseFloat((3.5 + ((i * 7) % 15) / 10).toFixed(1)),
    reviewCount: 4 + ((i * 11) % 120),
  };
}).filter((p) => p.status === "published");

async function fetchProducts({
  pageParam = 0,
  search,
  category,
  sortBy,
  tags,
}: {
  pageParam?: number;
  search: string;
  category: string;
  sortBy: string;
  tags: string[];
}): Promise<FetchResult> {
  await new Promise((r) => setTimeout(r, 400));
  const LIMIT = 12;

  let result = [...PRODUCT_DATA];

  if (search)
    result = result.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  if (category !== "all")
    result = result.filter((p) => p.category === category);
  if (tags.length)
    result = result.filter((p) => tags.some((t) => p.tags.includes(t)));

  if (sortBy === "price-lo") result.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-hi") result.sort((a, b) => b.price - a.price);
  else if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
  else if (sortBy === "newest") result.sort((a, b) => parseInt(b.id.split("_")[1]) - parseInt(a.id.split("_")[1]));

  const start = pageParam * LIMIT;
  return {
    products: result.slice(start, start + LIMIT),
    nextPage: start + LIMIT < result.length ? pageParam + 1 : undefined,
    total: result.length,
  };
}


const css = `
  /* ── Navbar ── */
  .nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 60px;
    background: rgba(12,12,14,0.85); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo {
    font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
    color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 8px;
  }
  .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .nav-links { display: flex; gap: 28px; }
  .nav-link {
    font-size: 13px; font-weight: 600; color: var(--text-dim);
    text-decoration: none; transition: color var(--transition);
  }
  .nav-link:hover { color: var(--text); }
  .nav-link.active { color: var(--accent); }
  .nav-actions { display: flex; align-items: center; gap: 12px; }
  .cart-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 99px;
    color: var(--text); font-family: var(--sans); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all var(--transition);
  }
  .cart-btn:hover { border-color: var(--accent); background: var(--accent-dim); color: var(--accent); }
  .cart-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; background: var(--accent); color: #fff;
    border-radius: 50%; font-size: 10px; font-weight: 800; font-family: var(--mono);
  }

  /* ── Hero ── */
  .hero {
    padding: 72px 40px 56px;
    background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,106,255,0.12) 0%, transparent 70%);
    text-align: center; border-bottom: 1px solid var(--border);
  }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 11px; color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.12em;
    background: var(--accent-dim); padding: 4px 12px; border-radius: 99px;
    border: 1px solid rgba(124,106,255,0.25); margin-bottom: 18px;
  }
  .hero-title {
    font-size: clamp(36px, 5vw, 64px); font-weight: 800;
    letter-spacing: -2px; line-height: 1.05;
    background: linear-gradient(135deg, var(--text) 0%, var(--text-dim) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 16px;
  }
  .hero-sub { font-size: 16px; color: var(--text-muted); max-width: 480px; margin: 0 auto 32px; line-height: 1.6; }
  .hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .btn-cta-primary {
    padding: 12px 28px; background: var(--accent); color: #fff;
    border: none; border-radius: 99px; font-family: var(--sans);
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all var(--transition); text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-cta-primary:hover { background: #9080ff; box-shadow: 0 0 32px var(--accent-glow); transform: translateY(-1px); }
  .btn-cta-ghost {
    padding: 12px 28px; background: transparent; color: var(--text-dim);
    border: 1px solid var(--border); border-radius: 99px; font-family: var(--sans);
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all var(--transition); text-decoration: none;
  }
  .btn-cta-ghost:hover { border-color: var(--border-hover); color: var(--text); }

  /* ── Category pills ── */
  .cat-strip {
    display: flex; gap: 8px; padding: 20px 40px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto; scrollbar-width: none; background: var(--surface);
  }
  .cat-strip::-webkit-scrollbar { display: none; }
  .cat-pill {
    flex-shrink: 0; padding: 7px 16px;
    background: transparent; border: 1px solid var(--border);
    border-radius: 99px; color: var(--text-muted);
    font-family: var(--mono); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all var(--transition); white-space: nowrap;
  }
  .cat-pill:hover { border-color: var(--border-hover); color: var(--text); }
  .cat-pill.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

  /* ── Main layout ── */
  .shop-layout { display: flex; min-height: calc(100vh - 60px); }

  /* ── Sidebar filters ── */
  .sidebar {
    width: 220px; flex-shrink: 0;
    border-right: 1px solid var(--border);
    padding: 24px 20px;
    position: sticky; top: 60px; height: calc(100vh - 60px);
    overflow-y: auto;
  }
  .sidebar-section { margin-bottom: 28px; }
  .sidebar-label {
    font-family: var(--mono); font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 10px;
  }
  .filter-check {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 0; cursor: pointer; color: var(--text-dim);
    font-size: 13px; transition: color var(--transition);
  }
  .filter-check:hover { color: var(--text); }
  .filter-check input[type="checkbox"] {
    width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer;
    flex-shrink: 0; background: none; border: none; padding: 0;
  }
  .price-range { display: flex; flex-direction: column; gap: 8px; }
  .price-range input[type="range"] {
    width: 100%; accent-color: var(--accent); background: none; border: none; padding: 0;
  }
  .price-range-labels { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
  .clear-filters {
    width: 100%; padding: 8px; background: var(--red-dim); color: var(--red);
    border: 1px solid rgba(255,92,92,0.2); border-radius: var(--radius);
    font-family: var(--mono); font-size: 12px; cursor: pointer;
    transition: all var(--transition); margin-top: 4px;
  }
  .clear-filters:hover { background: rgba(255,92,92,0.2); }

  /* ── Product grid ── */
  .grid-col { flex: 1; min-width: 0; }

  .toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-wrap: wrap;
  }
  .search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
  .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
  .search-input {
    width: 100%; padding: 9px 12px 9px 34px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--mono); font-size: 13px; outline: none;
    transition: border-color var(--transition);
  }
  .search-input::placeholder { color: var(--text-muted); }
  .search-input:focus { border-color: var(--accent); }

  .sort-select {
    padding: 9px 12px; background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); font-family: var(--mono); font-size: 13px;
    outline: none; cursor: pointer; transition: border-color var(--transition);
  }
  .sort-select:focus { border-color: var(--accent); }

  .result-count { font-family: var(--mono); font-size: 12px; color: var(--text-muted); margin-left: auto; }

  .view-btns { display: flex; gap: 4px; }
  .view-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text-muted); cursor: pointer; transition: all var(--transition);
  }
  .view-btn.active, .view-btn:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

  .product-grid {
    display: grid; padding: 24px;
    gap: 20px;
  }
  .product-grid.grid-4 { grid-template-columns: repeat(4, 1fr); }
  .product-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
  .product-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
  .product-grid.grid-list { grid-template-columns: 1fr; }

  /* ── Product Card ── */
  .product-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-xl); overflow: hidden;
    transition: all var(--transition); cursor: pointer; position: relative;
    display: flex; flex-direction: column;
  }
  .product-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .product-card.list-card { flex-direction: row; border-radius: var(--radius-lg); }

  .card-img-wrap { position: relative; overflow: hidden; aspect-ratio: 4/5; }
  .list-card .card-img-wrap { width: 140px; flex-shrink: 0; aspect-ratio: auto; }
  .card-img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 400ms cubic-bezier(0.4,0,0.2,1);
    display: block;
  }
  .product-card:hover .card-img { transform: scale(1.04); }

  .card-badges {
    position: absolute; top: 10px; left: 10px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .card-badge {
    padding: 3px 9px; border-radius: 99px; font-family: var(--mono);
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .badge-new { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(124,106,255,0.3); }
  .badge-sale { background: var(--red-dim); color: var(--red); border: 1px solid rgba(255,92,92,0.3); }
  .badge-bestseller { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,166,35,0.3); }
  .badge-limited { background: var(--green-dim); color: var(--green); border: 1px solid rgba(61,220,151,0.3); }

  .card-quick-add {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 12px;
    background: linear-gradient(to top, rgba(12,12,14,0.95) 60%, transparent);
    opacity: 0; transform: translateY(4px);
    transition: all 220ms cubic-bezier(0.4,0,0.2,1);
    pointer-events: none;
  }
  .product-card:hover .card-quick-add { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .btn-quick-add {
    width: 100%; padding: 10px; border: none; border-radius: var(--radius);
    background: var(--accent); color: #fff;
    font-family: var(--sans); font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all var(--transition);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .btn-quick-add:hover { background: #9080ff; }
  .btn-quick-add:disabled { background: var(--surface2); color: var(--text-muted); cursor: not-allowed; }
  .btn-quick-add.added { background: var(--green-dim); color: var(--green); }

  .card-body { padding: 14px 16px 16px; flex: 1; display: flex; flex-direction: column; }
  .list-card .card-body { padding: 20px; }
  .card-category { font-family: var(--mono); font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .card-title { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 6px; }
  .list-card .card-title { font-size: 16px; }

  .card-rating { display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
  .stars { color: var(--amber); font-size: 12px; letter-spacing: -1px; }
  .rating-count { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }

  .card-price-row { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
  .card-price { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--green); }
  .card-price-orig { font-family: var(--mono); font-size: 12px; color: var(--text-muted); text-decoration: line-through; }

  .card-inv {
    font-family: var(--mono); font-size: 11px;
    color: var(--text-muted); margin-top: 6px;
  }
  .card-inv.low { color: var(--red); }

  /* List card extra */
  .list-card .btn-quick-add {
    position: static; opacity: 1; transform: none;
    pointer-events: auto; background: transparent;
    border: 1px solid var(--accent); color: var(--accent);
    width: auto; padding: 8px 20px; margin-top: 16px;
    font-size: 13px;
  }
  .list-card .btn-quick-add:hover { background: var(--accent); color: #fff; }

  /* ── Skeleton loader ── */
  .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
  .skeleton { background: var(--surface2); animation: shimmer 1.4s infinite; }
  .skeleton-img { aspect-ratio: 4/5; }
  .skeleton-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .skeleton-line { height: 12px; border-radius: 4px; }
  @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  /* ── End / Empty ── */
  .end-msg { text-align: center; padding: 32px; font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
  .empty-state { text-align: center; padding: 80px 32px; }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.3; }
  .empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .empty-sub { font-size: 14px; color: var(--text-muted); }

  /* ── Added-to-cart toast ── */
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--surface2); border: 1px solid var(--green);
    border-radius: var(--radius-lg); padding: 12px 20px;
    font-family: var(--mono); font-size: 13px; color: var(--green);
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 400; animation: toastIn 200ms ease;
  }
  @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(12px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

  /* ── Sentinel ── */
  .sentinel { height: 60px; }

  @media (max-width: 1100px) { .product-grid.grid-4 { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 860px)  { .product-grid.grid-4, .product-grid.grid-3 { grid-template-columns: repeat(2, 1fr); } .sidebar { display: none; } }
  @media (max-width: 540px)  { .product-grid { grid-template-columns: 1fr !important; } .nav { padding: 0 16px; } .hero { padding: 48px 20px 40px; } }
`;

// ─── Star rating helper ───────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}


function ProductCard({
  product,
  listView,
  onAddToCart,
}: {
  product: Product;
  listView: boolean;
  onAddToCart: (p: Product) => void;
}) {
  const [added, setAdded] = useState(false);
  const [localInv, setLocalInv] = useState(product.inventory);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localInv <= 0) return;
    onAddToCart(product);
    setLocalInv((n) => n - 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const isLow = localInv > 0 && localInv <= 10;
  const isOut = localInv <= 0;

  return (
    <div
      className={`product-card${listView ? " list-card" : ""}`}
      onClick={() => {
        
        window.location.href = `/products/${product.handle}`;
      }}
    >
      <div className="card-img-wrap">
        <img src={product.thumbnail} alt={product.title} className="card-img" loading="lazy" />

        
        {product.tags.length > 0 && (
          <div className="card-badges">
            {product.tags.map((tag) => (
              <span key={tag} className={`card-badge badge-${tag}`}>{tag}</span>
            ))}
          </div>
        )}

        
        {!listView && (
          <div className="card-quick-add">
            <button
              className={`btn-quick-add${added ? " added" : ""}`}
              disabled={isOut}
              onClick={handleAdd}
            >
              {added ? (
                <>✓ Added</>
              ) : isOut ? (
                "Out of stock"
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Add to Cart
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-category">{product.category}</div>
        <div className="card-title">{product.title}</div>

        <div className="card-rating">
          <Stars rating={product.rating} />
          <span className="rating-count">({product.reviewCount})</span>
        </div>

        <div className="card-price-row">
          <span className="card-price">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="card-price-orig">${product.originalPrice.toFixed(2)}</span>
          )}
        </div>

        {isOut ? (
          <div className="card-inv low">Out of stock</div>
        ) : isLow ? (
          <div className="card-inv low">Only {localInv} left</div>
        ) : (
          <div className="card-inv">{localInv} in stock</div>
        )}

        {/* Add to cart button (list view only) */}
        {listView && (
          <button
            className={`btn-quick-add${added ? " added" : ""}`}
            disabled={isOut}
            onClick={handleAdd}
          >
            {added ? "✓ Added" : isOut ? "Out of stock" : "Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
}


function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-line" style={{ width: "50%" }} />
        <div className="skeleton skeleton-line" style={{ width: "75%" }} />
        <div className="skeleton skeleton-line" style={{ width: "40%" }} />
      </div>
    </div>
  );
}


export default function StorefrontPage() {
  const { itemCount } = useCartState();
  
  const dispatch = useCartDispatch() as any;

  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(250);
  const [viewMode, setViewMode] = useState<"4" | "3" | "2" | "list">("4");
  const [toast, setToast] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery({
      queryKey: ["storefront-products", { search: debouncedSearch, category, sortBy, tags: activeTags }],
      queryFn: ({ pageParam }) =>
        fetchProducts({ pageParam: pageParam as number, search: debouncedSearch, category, sortBy, tags: activeTags }),
      getNextPageParam: (last) => last.nextPage,
      initialPageParam: 0,
    });


  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const handleAddToCart = useCallback((product: Product) => {
    dispatch.addItem({
      id: product.id,
      title: product.title,
      price: Math.round(product.price * 100), // Convert dollars to cents for the backend
      thumbnail: product.thumbnail,
      quantity: 1,
    });
    setToast(`${product.title} added to cart`);
    setTimeout(() => setToast(null), 2200);
  }, [dispatch]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setActiveTags([]);
    setMaxPrice(250);
    setSortBy("newest");
  };

  const hasFilters = search || category !== "all" || activeTags.length || maxPrice < 250;

  const CATEGORIES = ["all", "Tops", "Bottoms", "Outerwear", "Accessories"];
  const TAG_OPTIONS = ["new", "sale", "bestseller", "limited"];

  return (
    <>
      <style>{css}</style>

      
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span className="nav-logo-dot" />
          commit&amp;conquer
        </a>
        <div className="nav-links">
          <a href="/" className="nav-link active">Shop</a>
          <a href="/collections" className="nav-link">Collections</a>
          <a href="/about" className="nav-link">About</a>
        </div>
        <div className="nav-actions">
          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Cart
            {itemCount > 0 && <span className="cart-badge">{itemCount > 9 ? "9+" : itemCount}</span>}
          </button>
        </div>
      </nav>

      
      <section className="hero">
        <div className="hero-eyebrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
          New Season — Drop 01
        </div>
        <h1 className="hero-title">Minimal. Functional.<br />Uncompromising.</h1>
        <p className="hero-sub">
          Clothing built for people who move with purpose. No logos, no excess — just craft.
        </p>
        <div className="hero-cta">
          <a href="#products" className="btn-cta-primary">
            Shop the Collection
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a href="/about" className="btn-cta-ghost">Our Story</a>
        </div>
      </section>

      
      <div className="cat-strip">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`cat-pill${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c === "all" ? "All Products" : c}
          </button>
        ))}
      </div>

      
      <div className="shop-layout" id="products">
        
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Sort by</div>
            {[
              { v: "newest", l: "Newest" },
              { v: "price-lo", l: "Price: Low → High" },
              { v: "price-hi", l: "Price: High → Low" },
              { v: "rating", l: "Top Rated" },
            ].map(({ v, l }) => (
              <label key={v} className="filter-check">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === v}
                  onChange={() => setSortBy(v)}
                  style={{ accentColor: "var(--accent)" }}
                />
                {l}
              </label>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Tags</div>
            {TAG_OPTIONS.map((tag) => (
              <label key={tag} className="filter-check">
                <input
                  type="checkbox"
                  checked={activeTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                />
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </label>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Max price: ${maxPrice}</div>
            <div className="price-range">
              <input
                type="range" min={0} max={250} step={5}
                value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)}
              />
              <div className="price-range-labels"><span>$0</span><span>$250</span></div>
            </div>
          </div>

          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </aside>

        
        <div className="grid-col">
          
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="search-input"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="price-lo">Price ↑</option>
              <option value="price-hi">Price ↓</option>
              <option value="rating">Top rated</option>
            </select>

            <span className="result-count">
              {isFetching && !isLoading ? "…" : `${total} products`}
            </span>

            
            <div className="view-btns">
              {(["4", "3", "list"] as const).map((v) => (
                <button
                  key={v}
                  className={`view-btn${viewMode === v ? " active" : ""}`}
                  onClick={() => setViewMode(v)}
                  title={v === "list" ? "List view" : `${v}-column grid`}
                >
                  {v === "list" ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          
          <div className={`product-grid grid-${viewMode}`}>
            {isLoading
              ? Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)
              : allProducts.length === 0
              ? (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <div className="empty-icon">◈</div>
                  <div className="empty-title">No products found</div>
                  <div className="empty-sub">Try adjusting your filters or search terms</div>
                </div>
              )
              : allProducts
                  .filter((p) => p.price <= maxPrice)
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      listView={viewMode === "list"}
                      onAddToCart={handleAddToCart}
                    />
                  ))
            }

            {isFetchingNextPage &&
              Array.from({ length: 4 }, (_, i) => <SkeletonCard key={`sk-${i}`} />)
            }
          </div>

          <div ref={sentinelRef} className="sentinel" />
          {!hasNextPage && allProducts.length > 0 && (
            <div className="end-msg">— All {total} products loaded —</div>
          )}
        </div>
      </div>

      
      {cartOpen && <CartDrawer />}

      
      {toast && (
        <div className="toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toast}
        </div>
      )}
    </>
  );
}