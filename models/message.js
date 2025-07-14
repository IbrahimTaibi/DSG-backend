const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true }, // optional, for store-delivery chat
});

module.exports = mongoose.model("Message", messageSchema);
