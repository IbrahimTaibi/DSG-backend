const Message = require("../models/message");
const Order = require("../models/order");
const User = require("../models/user");
const ApiError = require("../utils/ApiError");

// Store sends message to delivery guy (live, only if order is delivering and assigned)
exports.storeToDelivery = async (req, res) => {
  const { orderId, content } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found.");
  if (String(order.store) !== req.user.id)
    throw new ApiError(403, "Not your order.");
  if (order.status !== "delivering")
    throw new ApiError(400, "Can only chat when order is delivering.");
  if (!order.assignedTo) throw new ApiError(400, "No delivery guy assigned.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: order.assignedTo,
    content,
    order: order._id,
  });
  res.status(201).json(message);
};

// Store sends message to admin (not live, REST only)
exports.storeToAdmin = async (req, res) => {
  const { content } = req.body;
  // Find an admin (for demo, just pick one)
  const admin = await User.findOne({ role: "admin" });
  if (!admin) throw new ApiError(404, "No admin found.");
  const message = await Message.create({
    sender: req.user.id,
    receiver: admin._id,
    content,
  });
  res.status(201).json(message);
};

// Delivery guy sends message to admin (live)
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
