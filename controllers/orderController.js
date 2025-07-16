const Order = require("../models/order");
const Product = require("../models/product");
const ApiError = require("../utils/ApiError");
const User = require("../models/user");
const sendEmail = require("../utils/email");
const mongoose = require("mongoose");
const Return = require("../models/return");

// Helper to format order details as HTML
function orderHtml(order, products) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
      <div style="background: #4f8cff; color: #fff; padding: 20px; text-align: center;">
        <h2>Order #${order._id}</h2>
      </div>
      <div style="padding: 20px;">
        <h3>Order Details</h3>
        <ul style="padding-left: 20px;">
          ${products
            .map(
              (p) =>
                `<li><b>${p.product.name}</b> &times; ${p.quantity} — $${(
                  p.price * p.quantity
                ).toFixed(2)}</li>`,
            )
            .join("")}
        </ul>
        <p><b>Total:</b> $${order.total.toFixed(2)}</p>
      </div>
      <div style="background: #f7f7f7; color: #888; padding: 10px; text-align: center; font-size: 13px;">
        Thank you for using DSG!
      </div>
    </div>
  `;
}

// Store: Place order
exports.placeOrder = async (req, res) => {
  const { products, address } = req.body;
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Products are required.");
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
    if (!product) throw new ApiError(404, `Product not found: ${item.product}`);
    if (product.stock < item.quantity)
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    total += product.price * item.quantity;
    return {
      product: product._id,
      quantity: item.quantity,
      price: product.price, // Use current price from DB
    };
  });
  // Reduce stock
  await Promise.all(
    products.map(async (item) => {
      const product = productMap[item.product];
      if (!product) return;
      const updated = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (updated && updated.stock === 0) {
        updated.status = "out_of_stock";
        await updated.save();
      } else if (
        updated &&
        updated.status === "out_of_stock" &&
        updated.stock > 0
      ) {
        updated.status = "active";
        await updated.save();
      }
    }),
  );
  // Generate custom orderId
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01T00:00:00Z`),
      $lt: new Date(`${year + 1}-01-01T00:00:00Z`),
    },
  });
  const orderId = `ORD-${year}-${String(count + 1).padStart(3, "0")}`;
  const order = new Order({
    store: req.user.id,
    products: orderProducts,
    total,
    orderId,
    address: address || null,
  });
  await order.save();
  // Send confirmation email
  const user = await User.findById(req.user.id);
  if (user && user.email) {
    const populatedProducts = await Promise.all(
      orderProducts.map(async (op) => ({
        ...op,
        product: await Product.findById(op.product),
      })),
    );
    await sendEmail({
      to: user.email,
      subject: "Your DSG Order Confirmation",
      html: require("../utils/email").emailWrapper({
        title: "Order Confirmation",
        bodyHtml: `<h2 style='color:#4f8cff;'>Thank you for your order, ${
          user.name
        }!</h2>${orderHtml(order, populatedProducts)}`,
      }),
    });
  }
  // Create order confirmation notification for the user
  const Notification = require("../models/notification");
  await Notification.create({
    user: user._id,
    type: "order_confirmation",
    data: {
      orderId: order._id,
      total: order.total,
      status: order.status,
      products: order.products.map((p) => ({
        product: p.product,
        quantity: p.quantity,
        price: p.price,
      })),
      address: order.address || null,
    },
  });

  // Notify all admins about the new order
  const admins = await User.find({ role: "admin" });
  for (const admin of admins) {
    await Notification.create({
      user: admin._id,
      type: "new_order",
      data: {
        orderId: order._id,
        storeName: user.name,
        storeAddress: user.address || null,
        storePhone: user.mobile,
        products: order.products.map((p) => ({
          product: p.product,
          quantity: p.quantity,
          price: p.price,
        })),
        address: order.address || null,
        total: order.total,
        status: order.status,
      },
    });
  }
  res.status(201).json(order);
};

// Store: Get own orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ store: req.user.id })
    .populate("products.product")
    .sort("-createdAt");
  res.json(orders);
};

// Admin: Get all orders
exports.getAll = async (req, res) => {
  const orders = await Order.find()
    .populate("store assignedTo products.product")
    .sort("-createdAt");
  res.json(orders);
};

// Allowed status transitions
const allowedTransitions = {
  pending: ["waiting_for_delivery", "cancelled"],
  waiting_for_delivery: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

// Admin: Assign delivery guy
exports.assignDelivery = async (req, res) => {
  const { id } = req.params;
  const { deliveryGuyId } = req.body;
  const order = await Order.findById(id).populate([
    { path: "products.product" },
    { path: "store" },
  ]);
  if (!order) throw new ApiError(404, "Order not found.");
  order.assignedTo = deliveryGuyId;
  order.status = "waiting_for_delivery";
  await order.save();
  // Notify delivery guy
  const Notification = require("../models/notification");
  const { emitNotification } = require("../utils/notificationEmitter");

  // Build detailed notification data
  const store = order.store;
  const products = order.products.map((p) => ({
    name: p.product?.name || undefined,
    quantity: p.quantity,
    price: p.price,
  }));
  const address = order.address || null;

  const notification = await Notification.create({
    user: deliveryGuyId,
    type: "order_assigned",
    data: {
      orderId: order._id,
      orderNumber: order.orderId,
      store: store
        ? {
            id: store._id,
            name: store.name,
            address: store.address || null,
            phone: store.mobile,
          }
        : null,
      products,
      address,
      total: order.total,
      status: order.status,
    },
  });

  // Emit real-time notification to the delivery guy
  emitNotification(deliveryGuyId, notification);
  res.json(order);
};

// Delivery guy: Confirm got the order (set to delivering)
exports.gotOrder = async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  // Only assigned delivery guy can confirm
  if (String(order.assignedTo) !== String(req.user.id)) {
    throw new ApiError(
      403,
      "Only the assigned delivery guy can confirm receipt.",
    );
  }
  if (order.status !== "waiting_for_delivery") {
    throw new ApiError(400, "Order is not waiting for delivery.");
  }
  order.status = "delivering";
  await order.save();
  res.json(order);
};

// Admin: Update order status
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  if (!allowedTransitions[order.status].includes(status)) {
    throw new ApiError(
      400,
      `Cannot change status from ${order.status} to ${status}`,
    );
  }
  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: req.user.id,
    changedAt: new Date(),
  });
  await order.save();
  res.json(order);
};

// Delivery Guy: Get assigned orders
exports.getAssigned = async (req, res) => {
  const orders = await Order.find({ assignedTo: req.user.id })
    .populate("store products.product")
    .sort("-createdAt");
  res.json(orders);
};

// Delivery Guy: Update status (delivering, delivered)
exports.deliveryUpdateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findOne({ _id: id, assignedTo: req.user.id });
  if (!order)
    throw new ApiError(404, "Order not found or not assigned to you.");
  if (!allowedTransitions[order.status].includes(status)) {
    throw new ApiError(
      400,
      `Cannot change status from ${order.status} to ${status}`,
    );
  }
  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: req.user.id,
    changedAt: new Date(),
  });
  await order.save();
  res.json(order);
};

// Store or Admin: Mark a delivered order as returned
exports.returnOrder = async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status !== "delivered") {
    throw new ApiError(400, "Only delivered orders can be returned.");
  }
  // Only store owner or admin can return
  if (
    req.user.role !== "admin" &&
    String(order.store) !== String(req.user.id)
  ) {
    throw new ApiError(403, "Not authorized to return this order.");
  }
  order.status = "returned";
  order.statusHistory.push({
    status: "returned",
    changedBy: req.user.id,
    changedAt: new Date(),
  });
  await order.save();
  res.json(order);
};

// Store or Admin: Request a return for a delivered order
exports.requestReturn = async (req, res) => {
  const { id } = req.params;
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Products array is required for partial return.");
  }
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status !== "delivered") {
    throw new ApiError(400, "Only delivered orders can be returned.");
  }
  // Only store owner or admin can request return
  if (
    req.user.role !== "admin" &&
    String(order.store) !== String(req.user.id)
  ) {
    throw new ApiError(403, "Not authorized to return this order.");
  }
  // Validate products and quantities
  const orderProductMap = {};
  order.products.forEach((p) => {
    orderProductMap[String(p.product)] = p.quantity;
  });
  // Calculate already returned quantities for this order
  const previousReturns = await Return.find({ order: order._id });
  const returnedCount = {};
  previousReturns.forEach((ret) => {
    (ret.products || []).forEach((rp) => {
      const key = String(rp.product);
      returnedCount[key] = (returnedCount[key] || 0) + rp.quantity;
    });
  });
  // Validate each requested return
  for (const item of products) {
    const prodId = String(item.product);
    const reqQty = item.quantity;
    if (!orderProductMap[prodId]) {
      throw new ApiError(400, `Product ${prodId} is not in the order.`);
    }
    const alreadyReturned = returnedCount[prodId] || 0;
    const maxReturnable = orderProductMap[prodId] - alreadyReturned;
    if (reqQty < 1 || reqQty > maxReturnable) {
      throw new ApiError(
        400,
        `Invalid return quantity for product ${prodId}. Max allowed: ${maxReturnable}`,
      );
    }
  }
  // Create the return
  const returnDoc = await Return.create({
    order: order._id,
    requestedBy: req.user.id,
    products: products.map((p) => ({
      product: p.product,
      quantity: p.quantity,
    })),
  });
  res.status(201).json(returnDoc);
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId
    ? { $or: [{ _id: id }, { orderId: id }] }
    : { orderId: id };

  const order = await Order.findOne(query)
    .populate("products.product")
    .populate("store assignedTo");

  if (!order) return res.status(404).json({ message: "Order not found" });

  if (
    req.user.role !== "admin" &&
    String(order.store._id) !== String(req.user.id) &&
    (!order.assignedTo || String(order.assignedTo._id) !== String(req.user.id))
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to view this order" });
  }

  res.json(order);
};
