const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./user");

const orderProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, // Price at time of order
});

const orderSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    products: [orderProductSchema],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "waiting_for_delivery",
        "delivering",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    }, // Delivery guy
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery",
    },
    cancellationReason: { type: String },
    orderId: { type: String, unique: true, index: true },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    address: {
      type: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
      },
      default: null,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.statics.placeOrder = async function (storeId, products, address) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new Error("Products are required.");
  }
  // Fetch all products in one query
  const productIds = products.map((item) => item.product);
  const dbProducts = await Product.find({ _id: { $in: productIds } });
  const productMap = {};
  dbProducts.forEach((p) => {
    productMap[p._id.toString()] = p;
  });
  // Calculate total and validate products
  let total = 0;
  const orderProducts = products.map((item) => {
    const product = productMap[item.product];
    if (!product) throw new Error(`Product not found: ${item.product}`);
    if (product.stock < item.quantity)
      throw new Error(`Insufficient stock for ${product.name}`);
    total += product.price * item.quantity;
    return {
      product: product._id,
      quantity: item.quantity,
      price: product.price, // Use current price from DB
    };
  });
  // Reduce stock using Product model method
  for (const item of products) {
    const product = productMap[item.product];
    if (product) {
      await product.adjustStock(-item.quantity);
    }
  }
  // If address is not provided, use the user's address if available
  let finalAddress = address || null;
  if (!finalAddress) {
    const user = await User.findById(storeId);
    if (user && user.address) {
      finalAddress = user.address;
    }
  }
  if (!finalAddress) {
    throw new Error("Address is required to place the order.");
  }
  // Generate custom orderId
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00Z`),
      $lt: new Date(`${year + 1}-01-01T00:00:00Z`),
    },
  });
  const orderId = `ORD-${year}-${String(count + 1).padStart(3, "0")}`;
  const order = new this({
    store: storeId,
    products: orderProducts,
    total,
    orderId,
    address: finalAddress,
  });
  await order.save();
  return order;
};

module.exports = mongoose.model("Order", orderSchema);
