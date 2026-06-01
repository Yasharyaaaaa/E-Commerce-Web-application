import request from "supertest";
import app from "../src/app.js";
import { connectTestDB, disconnectTestDB } from "./db.js";
import { makeUser } from "./helpers.js";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

const sample = { name: "Test Widget", description: "A nice widget", price: 499, category: "gadgets", stock: 10 };

describe("Products", () => {
  test("lists products publicly", async () => {
    const res = await request(app).get("/api/products/v1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("rejects create without a token", async () => {
    const res = await request(app).post("/api/products/v1").send(sample);
    expect(res.status).toBe(401);
  });

  test("rejects create for a buyer (role)", async () => {
    const { token } = await makeUser("user");
    const res = await request(app)
      .post("/api/products/v1")
      .set("Authorization", `Bearer ${token}`)
      .send(sample);
    expect(res.status).toBe(403);
  });

  test("lets a seller create a product", async () => {
    const { token, user } = await makeUser("seller");
    const res = await request(app)
      .post("/api/products/v1")
      .set("Authorization", `Bearer ${token}`)
      .send(sample);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(sample.name);
    expect(String(res.body.data.seller)).toBe(String(user._id));
  });

  test("validates product fields on create", async () => {
    const { token } = await makeUser("seller");
    const res = await request(app)
      .post("/api/products/v1")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "missing name/price/category" });
    expect(res.status).toBe(400);
  });

  test("a seller cannot delete another seller's product", async () => {
    const owner = await makeUser("seller");
    const created = await request(app)
      .post("/api/products/v1")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(sample);
    const other = await makeUser("seller");
    const res = await request(app)
      .delete(`/api/products/v1/${created.body.data._id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(403);
  });
});
