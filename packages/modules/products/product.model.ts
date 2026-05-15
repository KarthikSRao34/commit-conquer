
import { type Product, type ProductVariant } from "../../core/types";
import { generateId, toHandle } from "../../core/utils";



const SEED_PRODUCTS: Product[] = [
  {
    id: "prod_001",
    title: "Obsidian Crew Neck",
    handle: "obsidian-crew-neck",
    description:
      "A heavyweight 400gsm cotton crew neck with a relaxed fit. Garment-dyed for a lived-in finish that softens with every wash.",
    thumbnail: "https://picsum.photos/seed/prod001/600/600",
    images: [
      "https://picsum.photos/seed/prod001a/800/800",
      "https://picsum.photos/seed/prod001b/800/800",
    ],
    status: "published",
    category: "Tops",
    tags: ["heavyweight", "cotton", "crew-neck"],
    variants: [
      _variant("prod_001", "S", "Black", 7900, 24),
      _variant("prod_001", "M", "Black", 7900, 41),
      _variant("prod_001", "L", "Black", 7900, 18),
      _variant("prod_001", "XL", "Black", 7900, 6),
    ],
    created_at: _daysAgo(30),
    updated_at: _daysAgo(2),
  },
  {
    id: "prod_002",
    title: "Slate Cargo Pant",
    handle: "slate-cargo-pant",
    description:
      "Six-pocket cargo silhouette in a durable ripstop fabric. Articulated knees and an adjustable waistband for all-day comfort.",
    thumbnail: "https://picsum.photos/seed/prod002/600/600",
    images: [
      "https://picsum.photos/seed/prod002a/800/800",
      "https://picsum.photos/seed/prod002b/800/800",
    ],
    status: "published",
    category: "Bottoms",
    tags: ["cargo", "ripstop", "technical"],
    variants: [
      _variant("prod_002", "30x30", "Slate", 11900, 15),
      _variant("prod_002", "32x30", "Slate", 11900, 33),
      _variant("prod_002", "34x32", "Slate", 11900, 20),
      _variant("prod_002", "36x32", "Slate", 11900, 0),
    ],
    created_at: _daysAgo(25),
    updated_at: _daysAgo(5),
  },
  {
    id: "prod_003",
    title: "Onyx Hoodie",
    handle: "onyx-hoodie",
    description:
      "French terry pullover with a kangaroo pocket and ribbed cuffs. Pre-shrunk so the fit stays true wash after wash.",
    thumbnail: "https://picsum.photos/seed/prod003/600/600",
    images: ["https://picsum.photos/seed/prod003a/800/800"],
    status: "published",
    category: "Tops",
    tags: ["hoodie", "french-terry", "pullover"],
    variants: [
      _variant("prod_003", "S", "Onyx", 9400, 50),
      _variant("prod_003", "M", "Onyx", 9400, 50),
      _variant("prod_003", "L", "Onyx", 9400, 50),
      _variant("prod_003", "XL", "Onyx", 9400, 12),
    ],
    created_at: _daysAgo(20),
    updated_at: _daysAgo(1),
  },
  {
    id: "prod_004",
    title: "Granite Bomber",
    handle: "granite-bomber",
    description:
      "MA-1 inspired bomber in a water-resistant shell with a contrast lining. Ribbed collar, cuffs, and hem.",
    thumbnail: "https://picsum.photos/seed/prod004/600/600",
    images: ["https://picsum.photos/seed/prod004a/800/800"],
    status: "published",
    category: "Outerwear",
    tags: ["bomber", "water-resistant", "MA-1"],
    variants: [
      _variant("prod_004", "S", "Granite", 16800, 8),
      _variant("prod_004", "M", "Granite", 16800, 14),
      _variant("prod_004", "L", "Granite", 16800, 10),
    ],
    created_at: _daysAgo(18),
    updated_at: _daysAgo(3),
  },
  {
    id: "prod_005",
    title: "Ash Trench Coat",
    handle: "ash-trench-coat",
    description:
      "Double-breasted trench in a cotton-poly twill. Storm flap, D-ring belt, and removable wool lining.",
    thumbnail: "https://picsum.photos/seed/prod005/600/600",
    images: ["https://picsum.photos/seed/prod005a/800/800"],
    status: "published",
    category: "Outerwear",
    tags: ["trench", "double-breasted", "wool-lining"],
    variants: [
      _variant("prod_005", "S", "Ash", 22900, 5),
      _variant("prod_005", "M", "Ash", 22900, 9),
      _variant("prod_005", "L", "Ash", 22900, 4),
      _variant("prod_005", "XL", "Ash", 22900, 2),
    ],
    created_at: _daysAgo(15),
    updated_at: _daysAgo(7),
  },
  {
    id: "prod_006",
    title: "Carbon Jogger",
    handle: "carbon-jogger",
    description:
      "Tapered jogger in a ponte-knit blend. Zip pockets, elastic waist, and a clean ankle hem.",
    thumbnail: "https://picsum.photos/seed/prod006/600/600",
    images: ["https://picsum.photos/seed/prod006a/800/800"],
    status: "published",
    category: "Bottoms",
    tags: ["jogger", "ponte", "tapered"],
    variants: [
      _variant("prod_006", "S", "Carbon", 8900, 30),
      _variant("prod_006", "M", "Carbon", 8900, 45),
      _variant("prod_006", "L", "Carbon", 8900, 28),
    ],
    created_at: _daysAgo(12),
    updated_at: _daysAgo(1),
  },
  {
    id: "prod_007",
    title: "Basalt Windbreaker",
    handle: "basalt-windbreaker",
    description:
      "Packable windbreaker with a mesh lining and stowable hood. Wind and light-rain resistant.",
    thumbnail: "https://picsum.photos/seed/prod007/600/600",
    images: ["https://picsum.photos/seed/prod007a/800/800"],
    status: "published",
    category: "Outerwear",
    tags: ["windbreaker", "packable", "technical"],
    variants: [
      _variant("prod_007", "S", "Basalt", 13400, 20),
      _variant("prod_007", "M", "Basalt", 13400, 25),
      _variant("prod_007", "L", "Basalt", 13400, 15),
    ],
    created_at: _daysAgo(10),
    updated_at: _daysAgo(2),
  },
  {
    id: "prod_008",
    title: "Charcoal Denim",
    handle: "charcoal-denim",
    description:
      "14oz Japanese selvedge denim in a slim-straight cut. Raw indigo finish that fades uniquely to you.",
    thumbnail: "https://picsum.photos/seed/prod008/600/600",
    images: ["https://picsum.photos/seed/prod008a/800/800"],
    status: "published",
    category: "Bottoms",
    tags: ["denim", "selvedge", "japanese"],
    variants: [
      _variant("prod_008", "30x30", "Charcoal", 18900, 10),
      _variant("prod_008", "32x30", "Charcoal", 18900, 16),
      _variant("prod_008", "34x32", "Charcoal", 18900, 8),
    ],
    created_at: _daysAgo(8),
    updated_at: _daysAgo(1),
  },
  {
    id: "prod_009",
    title: "Iron Fleece",
    handle: "iron-fleece",
    description:
      "300-weight polar fleece with a half-zip collar and kangaroo pocket. Brushed interior for next-to-skin warmth.",
    thumbnail: "https://picsum.photos/seed/prod009/600/600",
    images: ["https://picsum.photos/seed/prod009a/800/800"],
    status: "draft",
    category: "Tops",
    tags: ["fleece", "half-zip", "warm"],
    variants: [
      _variant("prod_009", "S", "Iron", 10900, 0),
      _variant("prod_009", "M", "Iron", 10900, 0),
      _variant("prod_009", "L", "Iron", 10900, 0),
    ],
    created_at: _daysAgo(5),
    updated_at: _daysAgo(5),
  },
  {
    id: "prod_010",
    title: "Flint Overshirt",
    handle: "flint-overshirt",
    description:
      "Brushed flannel overshirt with chest patch pockets and a relaxed body. Doubles as a lightweight layer.",
    thumbnail: "https://picsum.photos/seed/prod010/600/600",
    images: ["https://picsum.photos/seed/prod010a/800/800"],
    status: "published",
    category: "Tops",
    tags: ["flannel", "overshirt", "layering"],
    variants: [
      _variant("prod_010", "S", "Flint", 11400, 22),
      _variant("prod_010", "M", "Flint", 11400, 38),
      _variant("prod_010", "L", "Flint", 11400, 14),
    ],
    created_at: _daysAgo(3),
    updated_at: _daysAgo(0),
  },
];



const byId   = new Map<string, Product>(SEED_PRODUCTS.map((p) => [p.id, p]));
const byHandle = new Map<string, Product>(SEED_PRODUCTS.map((p) => [p.handle, p]));



export const ProductModel = {

  findAll(): Product[] {
    return [...byId.values()];
  },

  findById(id: string): Product | undefined {
    return byId.get(id);
  },

  findByHandle(handle: string): Product | undefined {
    return byHandle.get(handle);
  },

  findByCategory(category: string): Product[] {
    return [...byId.values()].filter((p) => p.category === category);
  },

  findPublished(): Product[] {
    return [...byId.values()].filter((p) => p.status === "published");
  },

  search(query: string): Product[] {
    const q = query.toLowerCase();
    return [...byId.values()].filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)),
    );
  },

  create(data: Omit<Product, "id" | "handle" | "created_at" | "updated_at">): Product {
    const product: Product = {
      ...data,
      id: generateId("prod"),
      handle: toHandle(data.title),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    byId.set(product.id, product);
    byHandle.set(product.handle, product);
    return product;
  },

  update(id: string, changes: Partial<Product>): Product | undefined {
    const existing = byId.get(id);
    if (!existing) return undefined;

    
    const newHandle =
      changes.title && changes.title !== existing.title
        ? toHandle(changes.title)
        : existing.handle;

    const updated: Product = {
      ...existing,
      ...changes,
      id,                              
      handle: newHandle,
      updated_at: new Date().toISOString(),
    };

    if (newHandle !== existing.handle) {
      byHandle.delete(existing.handle);
      byHandle.set(newHandle, updated);
    }

    byId.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    const product = byId.get(id);
    if (!product) return false;
    byHandle.delete(product.handle);
    byId.delete(id);
    return true;
  },

  

  findVariant(productId: string, variantId: string): ProductVariant | undefined {
    return byId.get(productId)?.variants.find((v) => v.id === variantId);
  },

  updateVariantInventory(
    productId: string,
    variantId: string,
    delta: number,          
  ): ProductVariant | undefined {
    const product = byId.get(productId);
    if (!product) return undefined;

    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return undefined;

    variant.inventory_quantity = Math.max(
      0,
      variant.inventory_quantity + delta,
    );
    product.updated_at = new Date().toISOString();
    return variant;
  },

  

  stats() {
    const all = [...byId.values()];
    return {
      total:     all.length,
      published: all.filter((p) => p.status === "published").length,
      draft:     all.filter((p) => p.status === "draft").length,
      out_of_stock: all.filter((p) =>
        p.variants.every((v) => v.inventory_quantity === 0),
      ).length,
    };
  },
};



function _variant(
  productId: string,
  size: string,
  color: string,
  priceCents: number,
  qty: number,
): ProductVariant {
  return {
    id: `var_${productId}_${size}_${color}`.toLowerCase().replace(/\s/g, "_"),
    title: `${size} / ${color}`,
    sku:   `${productId}-${size}-${color}`.toUpperCase(),
    price: priceCents,
    inventory_quantity: qty,
    options: { size, color },
  };
}

function _daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}