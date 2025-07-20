const Order = require("../models/order");
const Product = require("../models/product");
const ApiError = require("../utils/ApiError");
const User = require("../models/user");
const sendEmail = require("../utils/email");
const mongoose = require("mongoose");
const Return = require("../models/return");
const catchAsync = require("../utils/catchAsync");
const {
  emitNotification,
  emitNotificationToUsers,
} = require("../utils/notificationEmitter");
const Invoice = require("../models/invoice");

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

async function generateNextInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const lastInvoice = await require("../models/invoice")
    .findOne({ invoiceNumber: { $regex: `^${prefix}` } })
    .sort({ invoiceNumber: -1 });
  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

// Store: Place order
exports.placeOrder = async (req, res) => {
  const { products, address, store } = req.body;
  let storeId = req.user.id;
  if (req.user.role === "admin" && store) {
    // Validate the store exists and is a store user
    const storeUser = await User.findById(store);
    if (!storeUser || storeUser.role !== "store") {
      throw new ApiError(400, "Invalid store ID for order creation.");
    }
    storeId = storeUser._id;
  }
  const order = await Order.placeOrder(storeId, products, address);
  // Send confirmation email
  const user = await User.findById(storeId);
  if (user && user.email) {
    const populatedProducts = await Promise.all(
      order.products.map(async (op) => ({
        ...op.toObject(),
        product: await Product.findById(op.product),
      })),
    );
    await sendEmail({
      to: user.email,
      subject: "Your DSG Order Confirmation",
      html: sendEmail.emailWrapper({
        title: "Order Confirmation",
        bodyHtml: `<h2 style='color:#4f8cff;'>Thank you for your order, ${
          user.name
        }!</h2>${orderHtml(order, populatedProducts)}`,
      }),
    });
  }
  // Create order confirmation notification for the user
  const Notification = require("../models/notification");
  const orderNotif = await Notification.create({
    user: storeId,
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
  emitNotification(storeId, orderNotif);

  // Notify all admins about the new order
  const admins = await User.find({ role: "admin" });
  for (const admin of admins) {
    const notif = await Notification.create({
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
    emitNotification(admin._id, notif);
  }
  res.status(201).json(order);
};

// Store: Get own orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({
    store: req.user.id,
    deleted: { $ne: true },
  })
    .populate("products.product")
    .sort("-createdAt")
    .lean();
  res.json(orders);
};

// Admin: Get all orders
exports.getAll = async (req, res) => {
  const orders = await Order.find({ deleted: { $ne: true } })
    .populate("store assignedTo products.product")
    .sort("-createdAt")
    .lean();
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
  const deliveryNotif = await Notification.create({
    user: deliveryGuyId,
    type: "order_assigned",
    data: {
      orderId: order._id,
      orderNumber: order.orderId,
      store: order.store
        ? {
            id: order.store._id,
            name: order.store.name,
            address: order.store.address || null,
            phone: order.store.mobile,
          }
        : null,
      products: order.products.map((p) => ({
        name: p.product?.name || undefined,
        quantity: p.quantity,
        price: p.price,
      })),
      address: order.address || null,
      total: order.total,
      status: order.status,
    },
  });
  emitNotification(deliveryGuyId, deliveryNotif);
  // Optionally send email to delivery guy (if email exists)
  const deliveryUser = await User.findById(deliveryGuyId);
  if (deliveryUser && deliveryUser.email) {
    await sendEmail({
      to: deliveryUser.email,
      subject: "New Order Assigned",
      html: sendEmail.emailWrapper({
        title: "Order Assigned to You",
        bodyHtml: `<p>You have been assigned a new order #${order.orderId}.</p>`,
      }),
    });
  }
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

  // Generate invoice if delivered and not already created
  if (status === "delivered") {
    console.log(
      `[INVOICE] Order ${order._id} marked as delivered by admin, checking for existing invoice`,
    );
    const existingInvoice = await Invoice.findOne({ order: order._id });
    if (!existingInvoice) {
      console.log(
        `[INVOICE] No existing invoice found, creating new invoice for order ${order._id}`,
      );
      try {
        // Populate products and store
        await order.populate({
          path: "products.product",
          populate: { path: "tax" },
        });
        await order.populate("store");
        let subtotal = 0;
        let totalTax = 0;
        const products = order.products.map((op) => {
          const taxRate = op.product.tax ? op.product.tax.rate : 0;
          const lineTotal = op.price * op.quantity; // This is already TTC
          const taxAmount =
            taxRate > 0 ? (lineTotal * taxRate) / (100 + taxRate) : 0;
          const lineSubtotal = lineTotal - taxAmount;
          subtotal += lineSubtotal;
          totalTax += taxAmount;
          return {
            product: op.product._id,
            name: op.product.name,
            quantity: op.quantity,
            price: op.price,
            tax: taxAmount, // Store tax amount as number
            total: lineTotal,
          };
        });
        const invoiceNumber = await generateNextInvoiceNumber();
        console.log(`[INVOICE] Generated invoice number: ${invoiceNumber}`);
        const invoice = new Invoice({
          order: order._id,
          products,
          subtotal,
          totalTax,
          total: subtotal + totalTax,
          customer: {
            id: order.store._id,
            name: order.store.name,
            email: order.store.email,
            address: order.address || order.store.address,
          },
          invoiceNumber,
          issuedAt: new Date(),
          status: "issued",
        });
        await invoice.save();
        console.log(
          `[INVOICE] Successfully created invoice ${invoice._id} for order ${order._id}`,
        );
      } catch (error) {
        console.error(
          `[INVOICE] Error creating invoice for order ${order._id}:`,
          error,
        );
        throw error;
      }
    } else {
      console.log(
        `[INVOICE] Invoice already exists for order ${order._id}: ${existingInvoice._id}`,
      );
    }
  }

  res.json(order);
};

// Update order (admin only)
exports.updateOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { address, assignedTo, status, cancellationReason, products, total } =
    req.body;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  let statusChanged = false;
  let oldStatus = order.status;

  // Restrict support: only allow address, assignedTo, cancellationReason, status
  if (req.user.role === "support") {
    if (typeof products !== "undefined" || typeof total !== "undefined") {
      throw new ApiError(403, "Support cannot change products or total.");
    }
  }

  // Update address if provided
  if (address) {
    order.address = address;
  }
  // Update assignedTo if provided
  if (assignedTo) {
    order.assignedTo = assignedTo;
  }
  // Update cancellationReason if provided
  if (typeof cancellationReason !== "undefined") {
    order.cancellationReason = cancellationReason;
  }
  // Update status if provided
  if (status) {
    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(status)) {
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
    statusChanged = true;
  }
  await order.save();
  // Notifications for status change
  if (statusChanged && status !== oldStatus) {
    const Notification = require("../models/notification");
    // Notify store
    const storeNotif = await Notification.create({
      user: order.store,
      type: "order_status_update",
      data: {
        orderId: order._id,
        status: order.status,
        oldStatus,
      },
    });
    emitNotification(order.store, storeNotif);
    // Notify delivery (if assigned)
    if (order.assignedTo) {
      const deliveryNotif = await Notification.create({
        user: order.assignedTo,
        type: "order_status_update",
        data: {
          orderId: order._id,
          status: order.status,
          oldStatus,
        },
      });
      emitNotification(order.assignedTo, deliveryNotif);
    }
    // Notify all admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      const notif = await Notification.create({
        user: admin._id,
        type: "order_status_update",
        data: {
          orderId: order._id,
          status: order.status,
          oldStatus,
        },
      });
      emitNotification(admin._id, notif);
    }
    // Optionally send email to store
    const storeUser = await User.findById(order.store);
    if (storeUser && storeUser.email) {
      await sendEmail({
        to: storeUser.email,
        subject: `Order Status Updated: ${order.status}`,
        html: sendEmail.emailWrapper({
          title: `Order Status Updated`,
          bodyHtml: `<p>Your order #${order.orderId} status changed from <b>${oldStatus}</b> to <b>${order.status}</b>.</p>`,
        }),
      });
    }
  }
  res.json(order);
});

// Delivery Guy: Get assigned orders
exports.getAssigned = async (req, res) => {
  const orders = await Order.find({
    assignedTo: req.user.id,
    deleted: { $ne: true },
  })
    .populate("store products.product")
    .sort("-createdAt")
    .lean();
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

  // Generate invoice if delivered and not already created
  if (status === "delivered") {
    console.log(
      `[INVOICE] Order ${order._id} marked as delivered, checking for existing invoice`,
    );
    const existingInvoice = await Invoice.findOne({ order: order._id });
    if (!existingInvoice) {
      console.log(
        `[INVOICE] No existing invoice found, creating new invoice for order ${order._id}`,
      );
      try {
        // Populate products and store
        await order.populate({
          path: "products.product",
          populate: { path: "tax" },
        });
        await order.populate("store");
        let subtotal = 0;
        let totalTax = 0;
        const products = order.products.map((op) => {
          const taxRate = op.product.tax ? op.product.tax.rate : 0;
          const lineTotal = op.price * op.quantity; // This is already TTC
          const taxAmount =
            taxRate > 0 ? (lineTotal * taxRate) / (100 + taxRate) : 0;
          const lineSubtotal = lineTotal - taxAmount;
          subtotal += lineSubtotal;
          totalTax += taxAmount;
          return {
            product: op.product._id,
            name: op.product.name,
            quantity: op.quantity,
            price: op.price,
            tax: taxAmount, // Store tax amount as number
            total: lineTotal,
          };
        });
        const invoiceNumber = await generateNextInvoiceNumber();
        console.log(`[INVOICE] Generated invoice number: ${invoiceNumber}`);
        const invoice = new Invoice({
          order: order._id,
          products,
          subtotal,
          totalTax,
          total: subtotal + totalTax,
          customer: {
            id: order.store._id,
            name: order.store.name,
            email: order.store.email,
            address: order.address || order.store.address,
          },
          invoiceNumber,
          issuedAt: new Date(),
          status: "issued",
        });
        await invoice.save();
        console.log(
          `[INVOICE] Successfully created invoice ${invoice._id} for order ${order._id}`,
        );
      } catch (error) {
        console.error(
          `[INVOICE] Error creating invoice for order ${order._id}:`,
          error,
        );
        throw error;
      }
    } else {
      console.log(
        `[INVOICE] Invoice already exists for order ${order._id}: ${existingInvoice._id}`,
      );
    }
  }
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
  // Notify store
  const Notification = require("../models/notification");
  const storeNotif = await Notification.create({
    user: order.store,
    type: "order_returned",
    data: {
      orderId: order._id,
      status: order.status,
    },
  });
  emitNotification(order.store, storeNotif);
  // Notify all admins
  const admins = await User.find({ role: "admin" });
  for (const admin of admins) {
    const notif = await Notification.create({
      user: admin._id,
      type: "order_returned",
      data: {
        orderId: order._id,
        status: order.status,
      },
    });
    emitNotification(admin._id, notif);
  }
  // Optionally send email to store
  const storeUser = await User.findById(order.store);
  if (storeUser && storeUser.email) {
    await sendEmail({
      to: storeUser.email,
      subject: `Order Returned`,
      html: sendEmail.emailWrapper({
        title: `Order Returned`,
        bodyHtml: `<p>Your order #${order.orderId} has been marked as returned.</p>`,
      }),
    });
  }
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
  // Notify store
  const Notification = require("../models/notification");
  const storeNotif = await Notification.create({
    user: order.store,
    type: "order_return_requested",
    data: {
      orderId: order._id,
      status: order.status,
    },
  });
  emitNotification(order.store, storeNotif);
  // Notify all admins
  const admins = await User.find({ role: "admin" });
  for (const admin of admins) {
    const notif = await Notification.create({
      user: admin._id,
      type: "order_return_requested",
      data: {
        orderId: order._id,
        status: order.status,
      },
    });
    emitNotification(admin._id, notif);
  }
  // Optionally send email to store
  const storeUser = await User.findById(order.store);
  if (storeUser && storeUser.email) {
    await sendEmail({
      to: storeUser.email,
      subject: `Order Return Requested`,
      html: sendEmail.emailWrapper({
        title: `Order Return Requested`,
        bodyHtml: `<p>A return has been requested for your order #${order.orderId}.</p>`,
      }),
    });
  }
  res.status(201).json(returnDoc);
};

// Admin or Store: Update return status
exports.updateReturnStatus = async (req, res) => {
  const { status } = req.body;
  req.return.status = status;
  await req.return.save();
  res.json(req.return);
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId
    ? { $or: [{ _id: id }, { orderId: id }], deleted: { $ne: true } }
    : { orderId: id, deleted: { $ne: true } };

  const order = await Order.findOne(query)
    .populate("products.product")
    .populate("store assignedTo")
    .lean();

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

// Cancel order
exports.cancelOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  const allowed = allowedTransitions[order.status] || [];
  if (!allowed.includes("cancelled")) {
    throw new ApiError(400, `Cannot cancel order from status ${order.status}`);
  }
  order.status = "cancelled";
  if (typeof cancellationReason !== "undefined") {
    order.cancellationReason = cancellationReason;
  }
  order.statusHistory.push({
    status: "cancelled",
    changedBy: req.user.id,
    changedAt: new Date(),
  });
  await order.save();
  // Notifications for cancellation
  const Notification = require("../models/notification");
  // Notify store
  const storeNotif = await Notification.create({
    user: order.store,
    type: "order_cancelled",
    data: {
      orderId: order._id,
      cancellationReason: order.cancellationReason,
    },
  });
  emitNotification(order.store, storeNotif);
  // Notify delivery (if assigned)
  if (order.assignedTo) {
    const deliveryNotif = await Notification.create({
      user: order.assignedTo,
      type: "order_cancelled",
      data: {
        orderId: order._id,
        cancellationReason: order.cancellationReason,
      },
    });
    emitNotification(order.assignedTo, deliveryNotif);
  }
  // Notify all admins
  const admins = await User.find({ role: "admin" });
  for (const admin of admins) {
    const notif = await Notification.create({
      user: admin._id,
      type: "order_cancelled",
      data: {
        orderId: order._id,
        cancellationReason: order.cancellationReason,
      },
    });
    emitNotification(admin._id, notif);
  }
  // Optionally send email to store
  const storeUser = await User.findById(order.store);
  if (storeUser && storeUser.email) {
    await sendEmail({
      to: storeUser.email,
      subject: `Order Cancelled`,
      html: sendEmail.emailWrapper({
        title: `Order Cancelled`,
        bodyHtml: `<p>Your order #${
          order.orderId
        } has been cancelled.</p><p>Reason: ${
          order.cancellationReason || "N/A"
        }</p>`,
      }),
    });
  }
  res.json(order);
});

exports.deleteOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found.");
  order.deleted = true;
  await order.save();
  res.json({ message: "Order soft deleted.", order });
});

exports.getInvoiceByOrderId = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const Invoice = require("../models/invoice");
  const Order = require("../models/order");
  const invoice = await Invoice.findOne({ order: orderId }).populate({
    path: "products.product products.tax customer.id order",
  });
  if (!invoice) throw new ApiError(404, "Invoice not found for this order.");

  // Security: Only allow
  // - Admins: any invoice
  // - Delivery: only if assigned and delivered
  // - Others: forbidden
  const user = req.user;
  if (user.role === "admin") {
    return res.json(invoice);
  }
  if (user.role === "delivery") {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found.");
    if (
      String(order.assignedTo) === String(user._id) &&
      order.status === "delivered"
    ) {
      return res.json(invoice);
    } else {
      throw new ApiError(403, "Not authorized to access this invoice.");
    }
  }
  throw new ApiError(403, "Not authorized to access this invoice.");
});
