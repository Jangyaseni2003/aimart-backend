const cron = require("node-cron");
const Product = require("../models/product.model");
const { recalculateForProducts } = require("../controller/pricing.controller");

function startPricingJob() {
  const schedule = process.env.PRICING_CRON_SCHEDULE || "0 * * * *";
  cron.schedule(schedule, async () => {
    console.log("Running scheduled dynamic pricing recalculation...");
    const products = await Product.find({});
    const results = await recalculateForProducts(products);
    console.log(`Pricing job updated ${results.length} product(s)`);
  });
  console.log(`Dynamic pricing job scheduled: "${schedule}"`);
}

module.exports = { startPricingJob };
