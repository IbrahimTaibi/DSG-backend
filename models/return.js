const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  status: {
    type: String,
    enum: [
      "requested",
      "approved",
      "rejected",
      "in_transit",
      "received",
      "completed",
      "cancelled",
    ],
    default: "requested",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Return", returnSchema);
