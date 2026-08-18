// Pure pricing rules engine: takes a product's base price, demand counters,
// stock, and (optional) competitor price, and computes the next dynamicPrice.
// Rules are applied in order, then the result is clamped to +/-30% of the
// base price so pricing can never drift into runaway territory.
function calculateDynamicPrice(product) {
  const base = product.price;
  let price = product.dynamicPrice ?? base;
  const { views = 0, cartAdds = 0, purchases = 0 } = product.demand || {};
  const demandScore = views * 1 + cartAdds * 3 + purchases * 10;
  const reasons = [];

  if (demandScore >= 50) {
    price *= 1.08;
    reasons.push("high demand (+8%)");
  } else if (demandScore === 0) {
    price *= 0.97;
    reasons.push("no recent demand (-3%)");
  }

  if (product.stock <= 5 && demandScore > 0) {
    price *= 1.05;
    reasons.push("low stock scarcity (+5%)");
  }

  if (product.competitorPrice && price > product.competitorPrice * 1.1) {
    price = product.competitorPrice * 1.05;
    reasons.push("capped near competitor price");
  }

  const min = base * 0.7;
  const max = base * 1.3;
  const preClampPrice = price;
  price = Math.min(Math.max(price, min), max);
  if (price !== preClampPrice) {
    reasons.push(
      price === min
        ? "clamped to price floor (-30% of base)"
        : "clamped to price ceiling (+30% of base)"
    );
  }
  price = Math.round(price * 100) / 100;

  return {
    price,
    reason: reasons.length ? reasons.join(", ") : "no change",
    demandScore,
  };
}

module.exports = { calculateDynamicPrice };
