import request from "supertest";
import app from "../src/app.js";
import { connectTestDB, disconnectTestDB } from "./db.js";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

const valid = { username: "alice", email: "alice@test.com", password: "secret123" };

describe("Auth — register", () => {
  test("registers a new buyer", async () => {
    const res = await request(app).post("/api/auth/v1/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe("user");
  });

  test("rejects a duplicate email", async () => {
    const res = await request(app).post("/api/auth/v1/register").send(valid);
    expect(res.status).toBe(400);
  });

  test("rejects an invalid email (validation)", async () => {
    const res = await request(app)
      .post("/api/auth/v1/register")
      .send({ username: "bob", email: "not-an-email", password: "secret123" });
    expect(res.status).toBe(400);
  });

  test("rejects a short password (validation)", async () => {
    const res = await request(app)
      .post("/api/auth/v1/register")
      .send({ username: "bob", email: "bob@test.com", password: "123" });
    expect(res.status).toBe(400);
  });

  test("public signup cannot create an admin", async () => {
    const res = await request(app)
      .post("/api/auth/v1/register")
      .send({ username: "evil", email: "evil@test.com", password: "secret123", role: "admin" });
    expect(res.status).toBe(400);
  });

  test("allows registering as a seller", async () => {
    const res = await request(app)
      .post("/api/auth/v1/register")
      .send({ username: "seller1", email: "seller1@test.com", password: "secret123", role: "seller" });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("seller");
  });
});

describe("Auth — login", () => {
  // Keep total /login calls <= 5 (loginLimitter window).
  test("logs in and returns an access token", async () => {
    const res = await request(app)
      .post("/api/auth/v1/login")
      .send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    // refresh cookie is set httpOnly
    expect(String(res.headers["set-cookie"])).toMatch(/refreshToken/);
  });

  test("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/v1/login")
      .send({ email: valid.email, password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("rejects login missing the password (validation)", async () => {
    const res = await request(app).post("/api/auth/v1/login").send({ email: valid.email });
    expect(res.status).toBe(400);
  });
});
