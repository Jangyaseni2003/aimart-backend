const { subscribeToQueue } = require("./broker");
const Product = require("../models/product.model");

module.exports = async function () {
  subscribeToQueue("CART_PRODUCT.ITEM_ADDED_TO_CART", async ({ productId, quantity }) => {
    await Product.updateOne(
      { _id: productId },
      { $inc: { "demand.cartAdds": quantity || 1 } }
    );
  });

  subscribeToQueue("ORDER_PRODUCT.ORDER_CREATED", async (order) => {
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: -item.quantity, "demand.purchases": item.quantity } }
      );
    }
  });
};
