require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const listner = require("./src/broker/listner");
const { connect } = require("./src/broker/broker");

connectDB();
connect().then(() => {
  listner();
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Seller dashboard service is running on port ${PORT}`);
});
