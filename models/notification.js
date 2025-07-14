const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
