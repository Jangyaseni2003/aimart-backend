const { Redis } = require("ioredis");
require("dotenv").config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

module.exports = { redis };
