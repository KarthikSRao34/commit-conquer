
export const DiscountService = {
  list: async () => [] as Array<{ id: string; code: string }>,
  create: async (input: any) => ({ id: `d_${Date.now()}`, ...input }),
  delete: async (id: string) => true,
};
