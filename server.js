require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("./models/message");
const Order = require("./models/order");
const User = require("./models/user");
const ApiError = require("./utils/ApiError");
const chatSocket = require("./socket/chat");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Use modularized chat logic
chatSocket(io);

// Initialize notification emitter
const { setIO } = require("./utils/notificationEmitter");
setIO(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
