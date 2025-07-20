const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        quantity: Number,
        price: Number,
        tax: Number,
        total: Number, // price * quantity + tax
      },
    ],
    subtotal: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    total: { type: Number, required: true },
    customer: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      address: mongoose.Schema.Types.Mixed,
    },
    invoiceNumber: { type: String, required: true, unique: true }, // e.g., INV-2025-00001
    issuedAt: { type: Date, required: true },
    paidAt: { type: Date },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      default: "issued",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invoice", invoiceSchema);
