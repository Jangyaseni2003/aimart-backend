require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const listner = require("./src/broker/listner");
const { connect } = require("./src/broker/broker");
const { startPricingJob } = require("./src/job/pricing.job");

connectDB();
connect().then(() => {
  listner();
});
startPricingJob();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
