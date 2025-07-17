const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const catchAsync = require("../utils/catchAsync");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ChatSession = require("../models/chatSession");

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

// Admin opens a chat session between two users
router.post(
  "/admin/session",
  auth,
  role("admin"),
  catchAsync(async (req, res) => {
    const { participants, type, order } = req.body;
    if (!Array.isArray(participants) || participants.length !== 2) {
      return res
        .status(400)
        .json({ message: "Exactly two participants required." });
    }
    const session = await ChatSession.create({
      participants,
      openedBy: req.user.id,
      type,
      order: order || undefined,
      active: true,
    });
    res.status(201).json(session);
  }),
);

// Admin closes a chat session
router.patch(
  "/admin/session/:id/close",
  auth,
  role("admin"),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const session = await ChatSession.findById(id);
    if (!session)
      return res.status(404).json({ message: "Session not found." });
    session.active = false;
    session.closedAt = new Date();
    await session.save();
    res.json(session);
  }),
);

// Fetch chat history between two users
router.get("/history/:userId", auth, catchAsync(messageController.getHistory));

module.exports = router;
