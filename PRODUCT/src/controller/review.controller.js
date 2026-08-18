const mongoose = require("mongoose");
const Review = require("../models/review.model");
const Product = require("../models/product.model");

async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(productId, {
    avgRating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
    reviewCount: stats ? stats.count : 0,
  });
}

async function upsertReview(req, res) {
  try {
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user.id },
      { rating: ratingNum, comment, username: req.user.username },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recomputeProductRating(productId);

    res.status(201).json({ message: "Review saved", review });
  } catch (error) {
    console.error("Error saving review:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getProductReviews(req, res) {
  try {
    const { id: productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 });
    res.status(200).json({ data: reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { upsertReview, getProductReviews };
