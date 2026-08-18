const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  demandSnapshot: {
    views: Number,
    cartAdds: Number,
    purchases: Number,
  },
}, { timestamps: true });

priceHistorySchema.index({ product: 1, createdAt: -1 });
const PriceHistory = mongoose.model("priceHistory", priceHistorySchema);

module.exports = PriceHistory;
