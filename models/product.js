const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "discontinued", "draft"],
      default: "active",
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    additionalCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    ], // Optional
    image: { type: String }, // URL or path
  },
  { timestamps: true },
);

// Text index for search
productSchema.index({ name: "text", description: "text" });

productSchema.methods.adjustStock = async function (quantity) {
  this.stock += quantity;
  if (this.stock <= 0) {
    this.status = "out_of_stock";
    this.stock = 0;
  } else if (this.status === "out_of_stock" && this.stock > 0) {
    this.status = "active";
  }
  await this.save();
};

module.exports = mongoose.model("Product", productSchema);
