
export type InventoryItem = { variant_id: string; stocked_quantity: number };

const store = new Map<string, number>();

export const InventoryService = {
  getByVariant: (variantId: string): InventoryItem => ({
    variant_id: variantId,
    stocked_quantity: store.get(variantId) ?? 0,
  }),
  listAll: async (): Promise<InventoryItem[]> =>
    Array.from(store.entries()).map(([k, v]) => ({ variant_id: k, stocked_quantity: v })),
  setStock: async (variantId: string, qty: number): Promise<InventoryItem> => {
    store.set(variantId, qty);
    return { variant_id: variantId, stocked_quantity: qty };
  },
};
