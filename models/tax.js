const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "TVA 19%"
    rate: { type: Number, required: true }, // e.g., 19
    code: { type: String, required: true, unique: true }, // e.g., "TVA19"
    description: { type: String },
    active: { type: Boolean, default: true },
    type: { type: String, default: "TVA" }, // e.g., "TVA", "FODEC"
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tax", taxSchema);
