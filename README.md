# AIMART — Microservices E-Commerce Backend

AIMART is an e-commerce backend built as 8 independent Node.js/Express
microservices that communicate over REST and RabbitMQ events, backed by a
database-per-service MongoDB layout. It includes an AI shopping assistant
built with LangGraph and Google Gemini that can search products and add
items to a user's cart on its own, via tool calling.

## Architecture

| Service | Port | Responsibility | Data store |
|---|---|---|---|
| [GATEWAY](GATEWAY) | 8000 | Reverse proxy — single entry point for the frontend | — |
| [AUTH](AUTH) | 3000 | Signup/login, JWT issuance, addresses | MongoDB, Redis |
| [PRODUCT](PRODUCT) | 3001 | Product catalog, image upload (ImageKit) | MongoDB |
| [CART](CART) | 3002 | Shopping cart | MongoDB |
| [ORDER](ORDER) | 3003 | Order creation — calls CART and PRODUCT | MongoDB |
| [PAYMENT](PAYMENT) | 3004 | Payments via Razorpay — calls ORDER | MongoDB |
| [AI-BUDDY](AI-BUDDY) | 3005 | AI shopping assistant (LangGraph + Gemini, Socket.IO) — calls PRODUCT and CART | — |
| [NOTIFICATION](NOTIFICATION) | 3006 | Emails order/payment events via Gmail OAuth2 | — |
| [SELLER-DASHBOARD](SELLER-DASHBOARD) | 3007 | Aggregated seller view of orders/products/payments | MongoDB |

Every service exposes `GET /` as a plain health check.

PRODUCT also runs a **dynamic pricing engine**: CART and ORDER publish
add-to-cart/purchase events over RabbitMQ, PRODUCT tracks per-product
demand (views/cart-adds/purchases) and stock, and an hourly `node-cron`
job (plus a manual `POST /api/products/pricing/recalculate` trigger) runs
a small rules engine that adjusts each product's `dynamicPrice` based on
demand, scarcity, and an optional seller-set competitor price — with every
change logged to price history and checkout charging the live
`dynamicPrice`, not the static base price.

## Frontend

The UI lives in a separate project, [`AIMART-FRONTEND`](../AIMART-FRONTEND) (its own repo — kept independent of this backend, the way a real company splits frontend/backend). It's a React + Vite SPA that talks to this backend exclusively through the GATEWAY at `http://localhost:8000`, so start this backend stack first, then follow that project's own README to run the frontend.

**Synchronous calls** (axios, JWT-authenticated): ORDER → CART, ORDER →
PRODUCT, PAYMENT → ORDER, AI-BUDDY → PRODUCT, AI-BUDDY → CART.

**Event-driven calls** (RabbitMQ, `amqplib`): ORDER and PAYMENT publish
events (`ORDER_SELLER_DASHBOARD.*`, `PAYMENT_SELLER_DASHBOARD.*`,
`PAYMENT_NOTIFICATION.*`) that SELLER-DASHBOARD and NOTIFICATION consume
to stay in sync without direct coupling.

**AI-BUDDY** runs a [LangGraph](https://langchain-ai.github.io/langgraphjs/)
state graph: the Gemini model reasons over the conversation, optionally
calls a tool (`searchProduct` / `addProductToCart`), observes the tool's
result, and loops until it has a final answer — a real agentic tool-use
loop, not a single prompt/response call. See
[AI-BUDDY/src/agent/agent.js](AI-BUDDY/src/agent/agent.js).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — nothing else needs to be installed locally (no Node, MongoDB, Redis, or RabbitMQ setup required).

## Setup

1. Clone the repo.
2. Every `.env` is gitignored (so no real secrets ever get committed) — each
   service ships a `.env.example` template instead. Copy each one to `.env`:

   ```bash
   cp .env.example .env
   cp AUTH/.env.example AUTH/.env
   cp PRODUCT/.env.example PRODUCT/.env
   cp CART/.env.example CART/.env
   cp ORDER/.env.example ORDER/.env
   cp PAYMENT/.env.example PAYMENT/.env
   cp AI-BUDDY/.env.example AI-BUDDY/.env
   cp NOTIFICATION/.env.example NOTIFICATION/.env
   cp SELLER-DASHBOARD/.env.example SELLER-DASHBOARD/.env
   cp GATEWAY/.env.example GATEWAY/.env
   ```

   The defaults work out of the box for Docker Compose — infra URLs, the
   RabbitMQ user/pass (root `.env`), and a `JWT_SECRET` placeholder are all
   pre-filled with matching values. You only need to generate your own
   `JWT_SECRET` (same value in all 7 files that use it — see the comment in
   each) and, for these three optional features, get a free third-party key:

   | Feature | File to edit | Where to get the key |
   |---|---|---|
   | Product image upload | `PRODUCT/.env` | Free signup at [imagekit.io](https://imagekit.io) → Dashboard → Developer options → API keys |
   | Payments | `PAYMENT/.env` | Free **Test Mode** keys at [razorpay.com](https://razorpay.com) → Dashboard → Settings → API Keys |
   | AI shopping assistant | `AI-BUDDY/.env` | Free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

   Everything else (auth, cart, orders, seller dashboard) works with zero
   extra setup.

   All three are free, require no credit card, and take a couple of
   minutes each. Email notifications (`NOTIFICATION/.env`) need Gmail
   OAuth2 credentials and are left blank by default — the service still
   runs fine, it just logs a warning instead of sending mail.

3. Start everything:

   ```bash
   docker-compose up --build
   ```

   This builds all 8 service images and starts them alongside MongoDB,
   Redis, and RabbitMQ, wired together on a shared Docker network.

## Verifying it's up

| Check | URL |
|---|---|
| GATEWAY | http://localhost:8000 |
| AUTH | http://localhost:3000 |
| PRODUCT | http://localhost:3001 |
| CART | http://localhost:3002 |
| ORDER | http://localhost:3003 |
| PAYMENT | http://localhost:3004 |
| AI-BUDDY | http://localhost:3005 |
| NOTIFICATION | http://localhost:3006 |
| SELLER-DASHBOARD | http://localhost:3007 |
| RabbitMQ management UI | http://localhost:15672 (login: `aimart` / `aimart123`) |
| API docs (Swagger UI) | http://localhost:8000/api-docs |

Each should return a small JSON status message.

## API documentation

A full OpenAPI 3.0 spec covering every route proxied through the GATEWAY
(auth, products, reviews, wishlist, cart, orders, payments, seller
dashboard) is served as an interactive Swagger UI at
`http://localhost:8000/api-docs` — "Try it out" works directly against the
running stack since the docs are same-origin with the API. The raw spec
lives at `GATEWAY/openapi.yaml`.

## Security

The GATEWAY (the single entry point for all traffic) applies:
- `helmet` for standard secure HTTP headers.
- `express-rate-limit` — 300 req/15min globally, and a stricter 20
  req/15min on `/api/auth/login` and `/api/auth/register` to blunt
  brute-force/credential-stuffing attempts.

MongoDB, Redis, and RabbitMQ all require authentication (credentials come
from the root `.env`, never committed — see `.env.example`).

## Testing

`AUTH` has a Jest + Supertest suite that runs against an in-memory MongoDB
(`mongodb-memory-server`) with the RabbitMQ broker and Redis client mocked
out, so it needs no live infrastructure:

```bash
cd AUTH
npm install
npm test
```

## CI

GitHub Actions workflows run on every push/PR:
- Backend (`.github/workflows/ci.yml`): syntax-checks every service and
  runs the AUTH test suite.
- Frontend (separate repo): lints and builds.

## Trying the end-to-end flow

The examples below hit each service directly on its own port, which still
works and is useful for isolating a single service. Once the frontend is
involved, everything instead goes through the GATEWAY at
`http://localhost:8000` (e.g. `http://localhost:8000/api/auth/register`),
which proxies to the same routes shown here.

```bash
# 1. Register a seller and a buyer
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{
  "username": "seller1", "email": "seller1@example.com", "password": "password123",
  "fullName": { "firstName": "Sam", "lastName": "Seller" }, "role": "seller"
}'

curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{
  "username": "buyer1", "email": "buyer1@example.com", "password": "password123",
  "fullName": { "firstName": "Bea", "lastName": "Buyer" }
}'

# 2. Log in as the seller and grab the JWT from the response/cookie
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{
  "email": "seller1@example.com", "password": "password123"
}'

# 3. Create a product as the seller (requires PRODUCT/.env ImageKit keys for the image upload
#    part to fully succeed; the product record itself will still be created)
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer <SELLER_TOKEN>" \
  -F "title=Wireless Mouse" -F "price=999" -F "stock=50"

# 4. Log in as the buyer, then add the product to cart
curl -X POST http://localhost:3002/api/cart/items \
  -H "Authorization: Bearer <BUYER_TOKEN>" -H "Content-Type: application/json" \
  -d '{ "productId": "<PRODUCT_ID>", "qty": 1 }'

# 5. Place the order (ORDER calls CART and PRODUCT internally over the Docker network)
curl -X POST http://localhost:3003/api/orders \
  -H "Authorization: Bearer <BUYER_TOKEN>" -H "Content-Type: application/json" \
  -d '{ "shippingAddress": { "street": "1 Main St", "city": "Metropolis", "state": "NY", "pincode": "10001", "country": "US" } }'

# 6. Initiate payment (requires PAYMENT/.env Razorpay keys)
curl -X POST http://localhost:3004/api/payments/create/<ORDER_ID> \
  -H "Authorization: Bearer <BUYER_TOKEN>"
```

After a payment or order event, check the `notification` and
`seller-dashboard` container logs (`docker-compose logs -f notification
seller-dashboard`) to see the RabbitMQ events land.

For AI-BUDDY, connect a Socket.IO client to `http://localhost:3005` with
the buyer's JWT and send a chat message like "find me a wireless mouse
and add it to my cart" — the agent will call `searchProduct` and
`addProductToCart` against the real PRODUCT and CART services.

## Local development without Docker

Every service still falls back to `http://localhost:<port>` for
inter-service calls when the corresponding `*_SERVICE_URL` env var isn't
set, so you can also run services natively with `npm install && npm run
dev` in each folder, pointed at a locally-installed MongoDB/Redis/
RabbitMQ.
