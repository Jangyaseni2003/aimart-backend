const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL || "http://localhost:3002";

const searchProduct = tool(
  async ({ query, token }) => {
    console.log("searchProduct called with data:", { query, token });

    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/api/products?q=${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return JSON.stringify(response.data);
  },
  {
    name: "searchProduct",
    description: "Search for products based on a query",
    schema: z.object({
      query: z.string().describe("The search query for products"),
    }),
  }
);

const addProductToCart = tool(
  async ({ productId, qty = 1, token }) => {
    const response = await axios.post(
      `${CART_SERVICE_URL}/api/cart/items`,
      {
        productId,
        qty,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return `Added product with id ${productId} (qty: ${qty}) to cart`;
  },
  {
    name: "addProductToCart",
    description:
      "Add a product to the shopping cart no need of user confirmation if you found a product add that to the cart directly. if there more than one product found add the first one",
    schema: z.object({
      productId: z
        .string()
        .describe("The id of the product to add to the cart"),
      qty: z
        .number()
        .describe("The quantity of the product to add to the cart")
        .default(1),
    }),
  }
);

module.exports = { searchProduct, addProductToCart };
