jest.setTimeout(30000); // 30 seconds for all tests
const request = require("supertest");
const mongoose = require("mongoose");
const http = require("http");
const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/user");
const Category = require("../models/category");
const Product = require("../models/product");
const Order = require("../models/order");

let server;
let adminToken, storeToken, deliveryToken;
let categoryId, productId, orderId;

beforeAll(async () => {
  await connectDB();
  // Empty the database before starting the test
  await User.deleteMany({});
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  server = http.createServer(app).listen(0);

  // Create admin
  await request(server).post("/api/auth/register").send({
    name: "Admin",
    mobile: "1000000000",
    password: "adminpass",
    role: "admin",
    email: "admin@test.com",
  });
  // Create store
  await request(server)
    .post("/api/auth/register")
    .send({
      name: "Store",
      mobile: "2000000000",
      password: "storepass",
      role: "store",
      address: {
        address: "123 Main St",
        city: "Testville",
        state: "TS",
        zipCode: "12345",
      },
      email: "store@test.com",
    });
  // Create delivery
  await request(server).post("/api/auth/register").send({
    name: "Delivery",
    mobile: "3000000000",
    password: "deliverypass",
    role: "delivery",
    email: "delivery@test.com",
  });

  // Login admin
  const adminRes = await request(server).post("/api/auth/login").send({
    mobile: "1000000000",
    password: "adminpass",
  });
  adminToken = adminRes.body.token;

  // Login store
  const storeRes = await request(server).post("/api/auth/login").send({
    mobile: "2000000000",
    password: "storepass",
  });
  storeToken = storeRes.body.token;

  // Login delivery
  const deliveryRes = await request(server).post("/api/auth/login").send({
    mobile: "3000000000",
    password: "deliverypass",
  });
  deliveryToken = deliveryRes.body.token;
});

afterAll(async () => {
  await mongoose.connection.close();
  await new Promise((resolve) => server.close(resolve));
});

describe("API Integration Smoke Test", () => {
  test("Admin can create category", async () => {
    const res = await request(server)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Snacks" });
    expect(res.statusCode).toBe(201);
    categoryId = res.body._id;
  });

  test("Admin can create product", async () => {
    const res = await request(server)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Lays", price: 10, stock: 100, category: categoryId });
    expect(res.statusCode).toBe(201);
    productId = res.body._id;
  });

  test("Store can place order", async () => {
    const res = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ products: [{ product: productId, quantity: 2 }] });
    expect(res.statusCode).toBe(201);
    orderId = res.body._id;
  });

  test("Admin can assign delivery guy", async () => {
    // Get delivery user id
    const deliveryUser = await User.findOne({ mobile: "3000000000" });
    const res = await request(server)
      .put(`/api/orders/${orderId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deliveryGuyId: deliveryUser._id });
    expect(res.statusCode).toBe(200);
    expect(res.body.assignedTo).toBe(String(deliveryUser._id));
  });

  test("Delivery guy can see assigned orders", async () => {
    const res = await request(server)
      .get("/api/orders/assigned")
      .set("Authorization", `Bearer ${deliveryToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("Order Cancellation", () => {
  let cancelOrderId;

  beforeAll(async () => {
    // Place a new order as store for cancellation tests
    const res = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ products: [{ product: productId, quantity: 1 }] });
    cancelOrderId = res.body._id;
  });

  test("Store can cancel their own order with a reason", async () => {
    const res = await request(server)
      .put(`/api/orders/${cancelOrderId}/cancel`)
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ reason: "Customer changed mind" });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(res.body.cancellationReason).toBe("Customer changed mind");
    expect(res.body.statusHistory.some((h) => h.status === "cancelled")).toBe(
      true,
    );
  });

  test("Delivery cannot cancel an order not assigned to them", async () => {
    // Place another order as store
    const resOrder = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ products: [{ product: productId, quantity: 1 }] });
    const unassignedOrderId = resOrder.body._id;
    const res = await request(server)
      .put(`/api/orders/${unassignedOrderId}/cancel`)
      .set("Authorization", `Bearer ${deliveryToken}`)
      .send({ reason: "Not my order" });
    expect(res.statusCode).toBe(403);
  });

  test("Admin can cancel any order", async () => {
    // Place another order as store
    const resOrder = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ products: [{ product: productId, quantity: 1 }] });
    const orderId = resOrder.body._id;
    const res = await request(server)
      .put(`/api/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Admin test cancel" });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(res.body.cancellationReason).toBe("Admin test cancel");
    expect(
      res.body.statusHistory.some(
        (h) =>
          h.status === "cancelled" &&
          h.changedBy ===
            res.body.statusHistory[res.body.statusHistory.length - 1].changedBy,
      ),
    ).toBe(true);
  });
});

describe("Order Soft Delete & Admin Order Creation", () => {
  let storeUserId, adminOrderId, softDeleteOrderId;

  beforeAll(async () => {
    // Get store user id
    const storeUser = await User.findOne({ mobile: "2000000000" });
    storeUserId = storeUser._id;
    // Place an order as store (to be soft deleted)
    const res = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${storeToken}`)
      .send({ products: [{ product: productId, quantity: 1 }] });
    softDeleteOrderId = res.body._id;
  });

  test("Soft delete order hides it from queries", async () => {
    // Soft delete the order
    const resDel = await request(server)
      .delete(`/api/orders/${softDeleteOrderId}`)
      .set("Authorization", `Bearer ${storeToken}`);
    expect(resDel.statusCode).toBe(200);
    // Should not appear in store's order list
    const resList = await request(server)
      .get("/api/orders/my")
      .set("Authorization", `Bearer ${storeToken}`);
    expect(resList.body.some((o) => o._id === softDeleteOrderId)).toBe(false);
  });

  test("Admin can create order for store, address fallback works", async () => {
    // Remove address from store user
    await User.findByIdAndUpdate(storeUserId, { $unset: { address: "" } });
    // Try to create order without address (should fail)
    const resFail = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        products: [{ product: productId, quantity: 1 }],
        store: storeUserId,
      });
    expect(resFail.statusCode).toBe(400);
    // Add address back
    await User.findByIdAndUpdate(storeUserId, { address: "456 Admin St" });
    // Now create order as admin for store (should succeed, use store's address)
    const res = await request(server)
      .post("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        products: [{ product: productId, quantity: 1 }],
        store: storeUserId,
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.address).toBe("456 Admin St");
    adminOrderId = res.body._id;
  });
});
