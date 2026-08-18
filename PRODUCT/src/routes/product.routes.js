const express = require("express");
const router = express.Router();
const multer = require("multer");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const productController = require("../controller/product.controller");
const reviewController = require("../controller/review.controller");
const pricingController = require("../controller/pricing.controller");
const { createProductValidator } = require("../validators/product.validators");

const upload = multer({ storage: multer.memoryStorage() });
// POST /api/products/
router.post(
  "/",
  createAuthMiddleware(["admin", "seller"]),
  upload.array("images", 5),
  createProductValidator,
  productController.createProduct
);

//GET /api/products/
router.get("/", productController.getProducts);

//GET /api/products/categories
router.get("/categories", productController.getCategories);

//PATCH /api/products/:id
router.patch(
  "/:id",
  createAuthMiddleware(["seller"]),
  upload.array("images", 5),
  productController.updateProduct
);

//DELETE /api/products/:id
router.delete(
  "/:id",
  createAuthMiddleware(["seller"]),
  productController.deleteProduct
);

//GET /api/products/seller
router.get(
  "/seller",
  createAuthMiddleware(["seller"]),
  productController.getProductsBySeller
);

//POST /api/products/pricing/recalculate
router.post(
  "/pricing/recalculate",
  createAuthMiddleware(["seller", "admin"]),
  pricingController.recalculatePrices
);

//GET /api/products/:id/price-history
router.get("/:id/price-history", pricingController.getPriceHistory);

//PATCH /api/products/:id/competitor-price
router.patch(
  "/:id/competitor-price",
  createAuthMiddleware(["seller"]),
  pricingController.setCompetitorPrice
);

//GET /api/products/:id/reviews
router.get("/:id/reviews", reviewController.getProductReviews);

//POST /api/products/:id/reviews
router.post(
  "/:id/reviews",
  createAuthMiddleware(["user"]),
  reviewController.upsertReview
);

//GET /api/products/:id
router.get("/:id", productController.getProductById);

module.exports = router;
