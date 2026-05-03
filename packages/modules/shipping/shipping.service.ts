// Minimal shipping service stub
export const ShippingService = {
  listOptions: async () => [
    { id: "std", name: "Standard", price: 500, days: "5-7" },
    { id: "exp", name: "Express", price: 1200, days: "2-3" },
  ],
  createOption: async (input: any) => ({ id: `ship_${Date.now()}`, ...input }),
};
