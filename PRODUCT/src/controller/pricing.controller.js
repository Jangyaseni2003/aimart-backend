const mongoose = require("mongoose");
const Product = require("../models/product.model");
const PriceHistory = require("../models/priceHistory.model");
const { calculateDynamicPrice } = require("../service/pricing.service");

// Cooldown between recalculations of the same product. Demand counters reset
// to 0 on every recalculation, so recalculating again immediately (e.g. from
// spam-clicking the manual trigger) would read zero fresh demand and just
// keep applying the "no recent demand" price drop with nothing to show for
// it. Skipping products still in cooldown keeps repeat clicks harmless.
const COOLDOWN_MS = Number(process.env.PRICING_COOLDOWN_MS) || 5 * 60 * 1000;

async function recalculateForProducts(products) {
  const results = [];
  const now = Date.now();

  for (const product of products) {
    if (
      product.lastPriceRecalculatedAt &&
      now - product.lastPriceRecalculatedAt.getTime() < COOLDOWN_MS
    ) {
      results.push({
        productId: product._id,
        title: product.title,
        skipped: true,
        reason: "cooldown active, try again later",
      });
      continue;
    }

    const { price, reason, demandScore } = calculateDynamicPrice(product);
    const changed = price !== product.dynamicPrice;
    const demandSnapshot = {
      views: product.demand.views,
      cartAdds: product.demand.cartAdds,
      purchases: product.demand.purchases,
    };

    product.dynamicPrice = price;
    product.demand.views = 0;
    product.demand.cartAdds = 0;
    product.demand.purchases = 0;
    product.lastPriceRecalculatedAt = new Date(now);
    await product.save();

    if (changed) {
      await PriceHistory.create({
        product: product._id,
        price,
        reason,
        demandSnapshot,
      });
    }

    results.push({
      productId: product._id,
      title: product.title,
      newPrice: price,
      reason,
      demandScore,
    });
  }
  return results;
}

async function recalculatePrices(req, res) {
  const filter = req.user.role === "admin" ? {} : { seller: req.user.id };
  const products = await Product.find(filter);
  const results = await recalculateForProducts(products);
  const updatedCount = results.filter((r) => !r.skipped).length;
  const skippedCount = results.length - updatedCount;
  res.status(200).json({
    message:
      `Updated ${updatedCount} product(s)` +
      (skippedCount ? `, ${skippedCount} skipped (cooldown)` : ""),
    results,
  });
}

async function getPriceHistory(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }
  const history = await PriceHistory.find({ product: id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.status(200).json({ data: history });
}

async function setCompetitorPrice(req, res) {
  const { id } = req.params;
  const { competitorPrice } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product ID format" });
  }
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  if (product.seller.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  product.competitorPrice = Number(competitorPrice);
  await product.save();
  res.status(200).json({ message: "Competitor price updated", product });
}

module.exports = {
  recalculateForProducts,
  recalculatePrices,
  getPriceHistory,
  setCompetitorPrice,
};
