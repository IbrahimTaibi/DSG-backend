const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

// Admin-only user management
router.get("/", auth, role("admin"), catchAsync(userController.list));

router.get(
  "/with-order-count",
  auth,
  role("admin"),
  catchAsync(userController.listWithOrderCount),
);
// Get all delivery users (admin only)
router.get(
  "/delivery",
  auth,
  role("admin"),
  catchAsync(userController.listDelivery),
);
router.get("/:id", auth, role("admin"), catchAsync(userController.getById));
router.put("/:id", auth, role("admin"), catchAsync(userController.update));
router.delete("/:id", auth, role("admin"), catchAsync(userController.remove));

module.exports = router;
