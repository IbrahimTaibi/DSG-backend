const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { fetchReturn } = require("../middleware/fetchResource");
const {
  validateReturnRequest,
  validateReturnStatusTransition,
} = require("../middleware/validate");

// Store or Admin
router.post(
  "/",
  auth,
  role("store", "admin"),
  catchAsync(orderController.placeOrder),
);
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

// Update order (admin only)
router.put(
  "/:id",
  auth,
  role("admin"),
  catchAsync(orderController.updateOrder),
);

// Soft delete order (admin only)
router.delete(
  "/:id",
  auth,
  role("admin"),
  catchAsync(orderController.deleteOrder),
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

// Return order (store, admin)
router.put(
  "/:id/return",
  auth,
  role("admin", "store"),
  catchAsync(orderController.returnOrder),
);

// Request return (store, admin)
router.put(
  "/:id/request-return",
  auth,
  role("admin", "store"),
  validateReturnRequest,
  catchAsync(orderController.requestReturn),
);

// Update return status (admin, store)
router.put(
  "/returns/:id/status",
  auth,
  role("admin", "store"),
  fetchReturn(),
  validateReturnStatusTransition,
  catchAsync(orderController.updateReturnStatus),
);

// Get order by ID
router.get("/:id", auth, catchAsync(orderController.getOrderById));
router.get(
  "/:orderId/invoice",
  auth,
  catchAsync(orderController.getInvoiceByOrderId),
);

module.exports = router;
