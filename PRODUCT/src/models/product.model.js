const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  avgRating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ["INR", "USD"],
    default: "INR",
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  images: [
    {
      url: String,
      thumbnail: String,
      id: String,
    },
  ],
  category: {
    type: String,
  },
  stock: {
    type: Number,
    default: 0,
  },
  dynamicPrice: {
    type: Number,
  },
  demand: {
    views: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
  },
  competitorPrice: {
    type: Number,
  },
  lastPriceRecalculatedAt: {
    type: Date,
  },
}, { timestamps: true });

productSchema.index({ title: "text", description: "text", category: "text" });
const Product = mongoose.model("product", productSchema);

module.exports = Product;
