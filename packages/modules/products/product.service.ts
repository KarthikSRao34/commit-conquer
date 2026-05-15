

import { type Product, type PaginatedResponse } from "../../core/types";
import { paginate, stripEmpty } from "../../core/utils";
import { eventBus, EVENT } from "../../core/event-bus";
import { ProductModel } from "./product.model";



export interface ListProductsInput {
  offset?: number;
  limit?: number;
  status?: "published" | "draft" | "archived" | "all";
  category?: string;
  search?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "title_asc";
}

export interface CreateProductInput {
  title: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  category?: string;
  tags?: string[];
  status?: "published" | "draft";
  variants: Array<{
    title: string;
    sku: string;
    price: number;           // cents
    inventory_quantity: number;
    options: Record<string, string>;
  }>;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  category?: string;
  tags?: string[];
  status?: "published" | "draft" | "archived";
}



export const ProductService = {

  
  list(input: ListProductsInput = {}): PaginatedResponse<Product> {
    const {
      offset = 0,
      limit = 12,
      status = "published",
      category,
      search,
      sort = "newest",
    } = input;

    let products = ProductModel.findAll();

   
    if (status !== "all") {
      products = products.filter((p) => p.status === status);
    }

  
    if (category && category !== "all") {
      products = products.filter((p) => p.category === category);
    }

  
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category?.toLowerCase().includes(q),
      );
    }

   
    products = _sort(products, sort);

   
    return paginate(products, offset, limit);
  },

  

  getById(id: string): Product {
    const product = ProductModel.findById(id);
    if (!product) throw new ServiceError("PRODUCT_NOT_FOUND", `Product ${id} not found`);
    return product;
  },

 
  getByHandle(handle: string): Product {
    const product = ProductModel.findByHandle(handle);
    if (!product) {
      throw new ServiceError("PRODUCT_NOT_FOUND", `Product with handle "${handle}" not found`);
    }
    return product;
  },

 

  async create(input: CreateProductInput): Promise<Product> {
    _validateCreate(input);

    const product = ProductModel.create({
      title:       input.title,
      description: input.description ?? "",
      thumbnail:   input.thumbnail ?? "",
      images:      input.images ?? [],
      status:      input.status ?? "draft",
      category:    input.category ?? "",
      tags:        input.tags ?? [],
      variants:    input.variants.map((v) => ({
        id:                 `var_${Math.random().toString(36).slice(2, 9)}`,
        title:              v.title,
        sku:                v.sku,
        price:              v.price,
        inventory_quantity: v.inventory_quantity,
        options:            v.options,
      })),
    });

    await eventBus.emit(EVENT.PRODUCT_CREATED, {
      product_id: product.id,
      title:      product.title,
    });

    return product;
  },

  

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    
    ProductService.getById(id);

    const changes = stripEmpty(input as Record<string, unknown>) as Partial<Product>;
    const updated = ProductModel.update(id, changes);

    if (!updated) {
      throw new ServiceError("UPDATE_FAILED", `Failed to update product ${id}`);
    }

    await eventBus.emit(EVENT.PRODUCT_UPDATED, {
      product_id: id,
      changes:    changes as Record<string, unknown>,
    });
    return updated;
  },

  

  async delete(id: string): Promise<{ deleted: string }> {
    ProductService.getById(id);  

    const ok = ProductModel.delete(id);
    if (!ok) throw new ServiceError("DELETE_FAILED", `Failed to delete product ${id}`);

    await eventBus.emit(EVENT.PRODUCT_DELETED, { product_id: id });

    return { deleted: id };
  },

  

  async bulkDelete(ids: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[]  = [];

    for (const id of ids) {
      try {
        await ProductService.delete(id);
        deleted.push(id);
      } catch {
        failed.push(id);
      }
    }

    return { deleted, failed };
  },



  async publish(id: string): Promise<Product> {
    const updated = await ProductService.update(id, { status: "published" });

    await eventBus.emit(EVENT.PRODUCT_PUBLISHED, { product_id: id });

    return updated;
  },

  async unpublish(id: string): Promise<Product> {
    return ProductService.update(id, { status: "draft" });
  },

 
  async adjustInventory(
    productId: string,
    variantId: string,
    delta: number,
  ): Promise<void> {
    const variant = ProductModel.updateVariantInventory(productId, variantId, delta);

    if (!variant) {
      throw new ServiceError(
        "VARIANT_NOT_FOUND",
        `Variant ${variantId} not found on product ${productId}`,
      );
    }

    const qty = variant.inventory_quantity;

    await eventBus.emit(EVENT.INVENTORY_UPDATED, {
      variant_id: variantId,
      quantity:   qty,
    });

    
    if (qty > 0 && qty <= 5) {
      await eventBus.emit(EVENT.INVENTORY_LOW, {
        variant_id: variantId,
        quantity:   qty,
        threshold:  5,
      });
    }

    // Emit out-of-stock
    if (qty === 0) {
      await eventBus.emit(EVENT.INVENTORY_OUT, { variant_id: variantId });
    }
  },

  

  stats() {
    return ProductModel.stats();
  },

 

  categories(): string[] {
    const all = ProductModel.findAll();
    const set = new Set(all.map((p) => p.category).filter(Boolean) as string[]);
    return [...set].sort();
  },
};



export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}



function _sort(products: Product[], sort: ListProductsInput["sort"]): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

      case "price_asc": {
        const aMin = Math.min(...a.variants.map((v) => v.price));
        const bMin = Math.min(...b.variants.map((v) => v.price));
        return aMin - bMin;
      }

      case "price_desc": {
        const aMin = Math.min(...a.variants.map((v) => v.price));
        const bMin = Math.min(...b.variants.map((v) => v.price));
        return bMin - aMin;
      }

      case "title_asc":
        return a.title.localeCompare(b.title);

      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

function _validateCreate(input: CreateProductInput): void {
  if (!input.title?.trim()) {
    throw new ServiceError("VALIDATION_ERROR", "Product title is required");
  }
  if (!input.variants || input.variants.length === 0) {
    throw new ServiceError("VALIDATION_ERROR", "At least one variant is required");
  }
  for (const v of input.variants) {
    if (!v.sku?.trim()) {
      throw new ServiceError("VALIDATION_ERROR", `Variant SKU is required`);
    }
    if (typeof v.price !== "number" || v.price < 0) {
      throw new ServiceError("VALIDATION_ERROR", `Variant price must be a non-negative number`);
    }
 
  }
}