// Minimal inventory service stub to satisfy imports in server
export const InventoryService = {
  getByVariant: (variantId: string) => ({ variant_id: variantId, stocked_quantity: 0 }),
  listAll: async () => [] as Array<{ variant_id: string; stocked_quantity: number }>,
  setStock: async (variantId: string, qty: number) => ({ variant_id: variantId, stocked_quantity: qty }),
};

export type InventoryItem = { variant_id: string; stocked_quantity: number };
