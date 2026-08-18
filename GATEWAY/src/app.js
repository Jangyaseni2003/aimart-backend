const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const { createProxyMiddleware } = require("http-proxy-middleware");

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3000";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3003";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3004";
const AI_BUDDY_SERVICE_URL =
  process.env.AI_BUDDY_SERVICE_URL || "http://localhost:3005";
const SELLER_DASHBOARD_SERVICE_URL =
  process.env.SELLER_DASHBOARD_SERVICE_URL || "http://localhost:3007";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// General limiter for all traffic, plus a stricter one specifically on the
// auth entry points to blunt brute-force/credential-stuffing attempts.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});
app.use(generalLimiter);
app.use(["/api/auth/login", "/api/auth/register"], authLimiter);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Gateway is running." });
});

const openapiDocument = YAML.load(path.join(__dirname, "..", "openapi.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Proxies are mounted at "/" and use `pathFilter` (rather than
// `app.use("/api/x", proxy)`) so Express doesn't strip the matched prefix
// off req.url before the proxy sees it - the full original path (e.g.
// /api/auth/register) is what needs to reach the upstream service.
app.use(
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/auth",
  })
);
app.use(
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/products",
  })
);
app.use(
  createProxyMiddleware({
    target: CART_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/cart",
  })
);
app.use(
  createProxyMiddleware({
    target: ORDER_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/orders",
  })
);
app.use(
  createProxyMiddleware({
    target: PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/payments",
  })
);
app.use(
  createProxyMiddleware({
    target: SELLER_DASHBOARD_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/api/seller/dashboard",
  })
);

// AI-BUDDY REST + Socket.IO (needs `ws: true` and the upgrade event wired up
// manually in server.js - see http-proxy-middleware's websocket docs).
const aiBuddyProxy = createProxyMiddleware({
  target: AI_BUDDY_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  pathFilter: "/socket.io",
});
app.use(aiBuddyProxy);

module.exports = { app, aiBuddyProxy };
