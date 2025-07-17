const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // admin
    type: {
      type: String,
      enum: ["store-admin", "delivery-delivery", "custom"],
      required: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    active: { type: Boolean, default: true },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
