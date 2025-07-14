const jwt = require("jsonwebtoken");
const Message = require("../models/message");
const Order = require("../models/order");
const User = require("../models/user");

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

      // Delivery <-> Admin
      if (
        (senderRole === "delivery" && receiver.role === "admin") ||
        (senderRole === "admin" && receiver.role === "delivery")
      ) {
        const message = await Message.create({
          sender: userId,
          receiver: to,
          content,
        });
        io.to(to).emit("receive_message", message);
        socket.emit("receive_message", message);
        return;
      }

      // Store <-> Delivery (order-based, only if delivering)
      if (
        (senderRole === "store" && receiver.role === "delivery") ||
        (senderRole === "delivery" && receiver.role === "store")
      ) {
        if (!orderId) return socket.emit("error", "Order ID required");
        const order = await Order.findById(orderId);
        if (!order) return socket.emit("error", "Order not found");
        if (order.status !== "delivering")
          return socket.emit("error", "Chat only allowed when delivering");
        // Check assignment
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

      // Delivery <-> Delivery not allowed
      if (senderRole === "delivery" && receiver.role === "delivery") {
        return socket.emit(
          "error",
          "Delivery guys cannot chat with each other",
        );
      }

      // Store <-> Admin not allowed live
      if (
        (senderRole === "store" && receiver.role === "admin") ||
        (senderRole === "admin" && receiver.role === "store")
      ) {
        return socket.emit("error", "Store-admin chat is not live");
      }

      socket.emit("error", "Not allowed");
    });

    // Optionally, handle disconnects, etc.
  });
};
