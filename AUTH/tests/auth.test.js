const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

// No live RabbitMQ/Redis is needed to run this suite - both are mocked so
// the tests are fast and don't depend on Docker being up.
jest.mock("../src/broker/broker", () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  publishToQueue: jest.fn().mockResolvedValue(undefined),
  subscribeToQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/db/redis", () => ({
  redis: { set: jest.fn().mockResolvedValue("OK"), on: jest.fn() },
}));

let mongod;
let app;

const validUser = {
  username: "testuser",
  email: "testuser@example.com",
  password: "password123",
  fullName: { firstName: "Test", lastName: "User" },
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri();
  process.env.JWT_SECRET = "test-secret-for-jest";
  await mongoose.connect(process.env.MONGO_URL);
  app = require("../src/app");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("POST /api/auth/register", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(validUser.username);
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a duplicate username or email", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("rejects a request missing required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "ab" });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(validUser);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it("rejects an incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrongpassword" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid Bearer token", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send(validUser);
    const token = registerRes.body.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/logout", () => {
  it("clears the session and responds 200", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send(validUser);
    const token = registerRes.body.token;

    const res = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
  });
});
