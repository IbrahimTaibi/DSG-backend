const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const catchAsync = require("../utils/catchAsync");
const { validate } = require("../middleware/validate");
const auth = require("../middleware/auth");

router.post(
  "/register",
  validate(authController.registerSchema),
  catchAsync(authController.register),
);
router.post("/login", catchAsync(authController.login));
// Placeholder for Google authentication
router.post("/google", catchAsync(authController.googleAuth));
router.post("/forgot-password", catchAsync(authController.forgotPassword));
router.post("/reset-password", catchAsync(authController.resetPassword));
router.get("/me", auth, catchAsync(authController.me));
router.get("/notifications", auth, catchAsync(authController.getNotifications));
router.put(
  "/notifications/:id/read",
  auth,
  catchAsync(authController.markNotificationRead),
);
router.put(
  "/notifications/read/all",
  auth,
  catchAsync(authController.markAllNotificationsRead),
);

module.exports = router;
