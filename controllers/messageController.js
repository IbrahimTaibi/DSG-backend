const Message = require("../models/message");
const Order = require("../models/order");
const User = require("../models/user");
const ApiError = require("../utils/ApiError");
const ChatSession = require("../models/chatSession");

// Helper: Check if an active chat session exists between two users for a type
async function hasActiveSession(userA, userB, type) {
  return !!(await ChatSession.findOne({
    participants: { $all: [userA, userB] },
    type,
    active: true,
  }));
}

// Store sends message to delivery guy (live, only if order is assigned)
exports.storeToDelivery = async (req, res) => {
  const { orderId, content } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found.");
  if (String(order.store) !== req.user.id)
    throw new ApiError(403, "Not your order.");
  if (!order.assignedTo) throw new ApiError(400, "No delivery guy assigned.");
  // Only allow if order is assigned to this delivery
  if (String(order.assignedTo) === req.user.id)
    throw new ApiError(400, "You cannot chat with yourself as delivery.");
  // Only allow if order is assigned to that delivery
  const message = await Message.create({
    sender: req.user.id,
    receiver: order.assignedTo,
    content,
    order: order._id,
  });
  res.status(201).json(message);
};

// Store sends message to admin (only if admin accepted)
exports.storeToAdmin = async (req, res) => {
  const { content, adminId } = req.body;
  const admin = await User.findOne({ _id: adminId, role: "admin" });
  if (!admin) throw new ApiError(404, "No admin found.");
  // Only allow if an active session exists
  const allowed = await hasActiveSession(req.user.id, admin._id, "store-admin");
  if (!allowed) throw new ApiError(403, "Admin has not accepted chat request.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: admin._id,
    content,
  });
  res.status(201).json(message);
};

// Store sends message to support (always allowed if support exists)
exports.storeToSupport = async (req, res) => {
  const { content } = req.body;
  const support = await User.findOne({ role: "support" });
  if (!support) throw new ApiError(404, "No support user found.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: support._id,
    content,
  });
  res.status(201).json(message);
};

// Delivery guy sends message to admin (always allowed)
exports.deliveryToAdmin = async (req, res) => {
  const { content } = req.body;
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new ApiError(404, "No admin found.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: admin._id,
    content,
  });
  res.status(201).json(message);
};

// Delivery guy sends message to another delivery (only if admin opened session)
exports.deliveryToDelivery = async (req, res) => {
  const { deliveryId, content } = req.body;
  if (deliveryId === req.user.id)
    throw new ApiError(400, "Cannot chat with yourself.");
  const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
  if (!delivery) throw new ApiError(404, "No delivery user found.");
  // Only allow if an active session exists
  const allowed = await hasActiveSession(
    req.user.id,
    delivery._id,
    "delivery-delivery",
  );
  if (!allowed) throw new ApiError(403, "Admin has not opened chat window.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: delivery._id,
    content,
  });
  res.status(201).json(message);
};

// Admin can chat with anyone (no restriction)
exports.adminToUser = async (req, res) => {
  const { userId, content } = req.body;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: user._id,
    content,
  });
  res.status(201).json(message);
};

// Delivery guy cannot chat with other delivery guys (enforced in socket logic)

// Fetch chat history between two users (with access checks)
exports.getHistory = async (req, res) => {
  const { userId } = req.params;
  // Only allow if admin, or sender/receiver is current user
  if (
    req.user.role !== "admin" &&
    req.user.id !== userId &&
    req.user.id !== req.query.with
  ) {
    throw new ApiError(403, "Not allowed to view this chat.");
  }
  const messages = await Message.find({
    $or: [
      { sender: req.user.id, receiver: userId },
      { sender: userId, receiver: req.user.id },
    ],
  }).sort("timestamp");
  res.json(messages);
};
