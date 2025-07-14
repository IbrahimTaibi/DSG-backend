const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Store sends message to delivery guy (live, order-based)
router.post(
  "/store/delivery",
  auth,
  role("store"),
  catchAsync(messageController.storeToDelivery),
);

// Store sends message to admin (REST only)
router.post(
  "/store/admin",
  auth,
  role("store"),
  catchAsync(messageController.storeToAdmin),
);

// Delivery guy sends message to admin (live)
router.post(
  "/delivery/admin",
  auth,
  role("delivery"),
  catchAsync(messageController.deliveryToAdmin),
);

// Fetch chat history between two users
router.get("/history/:userId", auth, catchAsync(messageController.getHistory));

module.exports = router;
