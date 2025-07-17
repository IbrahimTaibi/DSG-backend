const jwt = require("jsonwebtoken");
const Message = require("../models/message");
const Order = require("../models/order");
const User = require("../models/user");
const ChatSession = require("../models/chatSession");

async function hasActiveSession(userA, userB, type) {
  return !!(await ChatSession.findOne({
    participants: { $all: [userA, userB] },
    type,
    active: true,
  }));
}

module.exports = (io) => {
  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    socket.join(userId); // Each user joins their own room

    // Live chat: delivery guy <-> admin
    socket.on("send_message", async (data) => {
      const { to, content, orderId } = data;
      const senderRole = socket.user.role;
      const receiver = await User.findById(to);
      if (!receiver) return socket.emit("error", "Receiver not found");

      // Admin can chat with anyone
      if (senderRole === "admin") {
        const message = await Message.create({
          sender: userId,
          receiver: to,
          content,
          order: orderId,
        });
        io.to(to).emit("receive_message", message);
        socket.emit("receive_message", message);
        return;
      }
      if (receiver.role === "admin") {
        // Delivery <-> Admin always allowed
        if (senderRole === "delivery") {
          const message = await Message.create({
            sender: userId,
            receiver: to,
            content,
            order: orderId,
          });
          io.to(to).emit("receive_message", message);
          socket.emit("receive_message", message);
          return;
        }
        // Store <-> Admin only if session exists
        if (senderRole === "store") {
          const allowed = await hasActiveSession(userId, to, "store-admin");
          if (!allowed)
            return socket.emit("error", "Admin has not accepted chat request.");
          const message = await Message.create({
            sender: userId,
            receiver: to,
            content,
            order: orderId,
          });
          io.to(to).emit("receive_message", message);
          socket.emit("receive_message", message);
          return;
        }
      }
      // Store <-> Support always allowed
      if (
        (senderRole === "store" && receiver.role === "support") ||
        (senderRole === "support" && receiver.role === "store")
      ) {
        const message = await Message.create({
          sender: userId,
          receiver: to,
          content,
          order: orderId,
        });
        io.to(to).emit("receive_message", message);
        socket.emit("receive_message", message);
        return;
      }
      // Store <-> Delivery (order-based, only if assigned)
      if (
        (senderRole === "store" && receiver.role === "delivery") ||
        (senderRole === "delivery" && receiver.role === "store")
      ) {
        if (!orderId) return socket.emit("error", "Order ID required");
        const order = await Order.findById(orderId);
        if (!order) return socket.emit("error", "Order not found");
        // Only allow if assigned
        if (
          !(
            String(order.store) === userId ||
            String(order.assignedTo) === userId
          ) ||
          !(String(order.store) === to || String(order.assignedTo) === to)
        ) {
          return socket.emit("error", "Not allowed to chat for this order");
        }
        const message = await Message.create({
          sender: userId,
          receiver: to,
          content,
          order: orderId,
        });
        io.to(to).emit("receive_message", message);
        socket.emit("receive_message", message);
        return;
      }
      // Delivery <-> Delivery only if admin opened session
      if (senderRole === "delivery" && receiver.role === "delivery") {
        const allowed = await hasActiveSession(userId, to, "delivery-delivery");
        if (!allowed)
          return socket.emit("error", "Admin has not opened chat window.");
        const message = await Message.create({
          sender: userId,
          receiver: to,
          content,
          order: orderId,
        });
        io.to(to).emit("receive_message", message);
        socket.emit("receive_message", message);
        return;
      }
      socket.emit("error", "Not allowed");
    });

    // Optionally, handle disconnects, etc.
  });
};
