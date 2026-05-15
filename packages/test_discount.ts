import { CartService } from "./modules/cart/cart.service";
import { OrderService } from "./modules/orders/order.service";
import { ProductModel } from "./modules/products/product.model";

async function test() {
  try {
    const products = ProductModel.findAll();
    const product = products[0];
    const variant = product.variants[0];

    // 1st order
    const cart1 = await CartService.create("testuser@example.com");
    await CartService.addItem(cart1.id, product.id, variant.id, 1);
    await CartService.applyDiscount(cart1.id, "LAUNCH10");
    await CartService.setShippingAddress(cart1.id, {
      first_name: "Test", last_name: "User", address_1: "123 Main St", city: "SF", state: "CA", postal_code: "94105", country_code: "US"
    });
    const order1 = await OrderService.place({ cart_id: cart1.id });
    console.log("Order 1 placed successfully, order ID:", order1.id);

    // 2nd order
    const cart2 = await CartService.create("testuser@example.com");
    await CartService.addItem(cart2.id, product.id, variant.id, 1);
    await CartService.applyDiscount(cart2.id, "LAUNCH10");
    await CartService.setShippingAddress(cart2.id, {
      first_name: "Test", last_name: "User", address_1: "123 Main St", city: "SF", state: "CA", postal_code: "94105", country_code: "US"
    });
    
    console.log("Attempting to place Order 2 with same discount code...");
    await OrderService.place({ cart_id: cart2.id });
    console.log("ERROR: Order 2 placed successfully, but it SHOULD have failed.");
    process.exit(1);
  } catch (err: any) {
    if (err.name === "ServiceError" && err.code === "DISCOUNT_ALREADY_USED") {
      console.log("SUCCESS: Caught expected ServiceError:", err.message);
      process.exit(0);
    } else {
      console.error("ERROR: Caught unexpected error:", err);
      process.exit(1);
    }
  }
}

test();
