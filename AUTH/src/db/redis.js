const { Redis } = require("ioredis");
require("dotenv").config();

console.log(
  `Redis config: host=${process.env.REDIS_HOST} port=${process.env.REDIS_PORT} ` +
    `username=${(process.env.REDIS_USERNAME || "default").trim()} ` +
    `passwordLength=${process.env.REDIS_PASSWORD?.trim().length ?? 0}`
);

const redis = new Redis({
  host: process.env.REDIS_HOST?.trim(),
  port: Number(process.env.REDIS_PORT?.trim()),
  username: (process.env.REDIS_USERNAME || "default").trim(),
  password: process.env.REDIS_PASSWORD?.trim(),
  ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});
redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

module.exports = { redis };
