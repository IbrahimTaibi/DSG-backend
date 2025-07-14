const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Store
router.post("/", auth, role("store"), catchAsync(orderController.placeOrder));
router.get("/my", auth, role("store"), catchAsync(orderController.getMyOrders));

// Admin
router.get("/", auth, role("admin"), catchAsync(orderController.getAll));
router.put(
  "/:id/assign",
  auth,
  role("admin"),
  catchAsync(orderController.assignDelivery),
);
router.put(
  "/:id/status",
  auth,
  role("admin"),
  catchAsync(orderController.updateStatus),
);

// Delivery Guy
router.get(
  "/assigned",
  auth,
  role("delivery"),
  catchAsync(orderController.getAssigned),
);
router.put(
  "/:id/deliverystatus",
  auth,
  role("delivery"),
  catchAsync(orderController.deliveryUpdateStatus),
);

// Delivery guy confirms got the order
router.put(
  "/:id/got",
  auth,
  role("delivery"),
  catchAsync(orderController.gotOrder),
);

// Cancel order (store, admin, delivery)
router.put(
  "/:id/cancel",
  auth,
  role("admin", "store", "delivery"),
  catchAsync(orderController.cancelOrder),
);

// Get order by ID
router.get("/:id", auth, catchAsync(orderController.getOrderById));

module.exports = router;
