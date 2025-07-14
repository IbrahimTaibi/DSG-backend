const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String }, // Not required for Google auth
    email: { type: String },
    role: {
      type: String,
      enum: ["admin", "store", "delivery"],
      default: "store",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "deleted"],
      default: "active",
      index: true,
    },
    address: {
      type: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
      },
      default: null,
    },
    // Google Auth placeholder
    googleId: { type: String },
    googleEmail: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
