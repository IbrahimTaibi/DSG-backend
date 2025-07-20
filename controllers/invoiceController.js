const Invoice = require("../models/invoice");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

// List all invoices (admin only)
exports.getAll = catchAsync(async (req, res) => {
  const invoices = await Invoice.find().populate({
    path: "products.product products.tax customer.id order",
  });
  res.json(invoices);
});

// Get invoice by invoice ID (admin only)
exports.getById = catchAsync(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate({
    path: "products.product products.tax customer.id order",
  });
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json(invoice);
});

// Update invoice by ID (admin only)
exports.update = catchAsync(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  // Only allow updating certain fields for safety
  const { status, paidAt, sentAt } = req.body;
  if (status) invoice.status = status;
  if (paidAt) invoice.paidAt = paidAt;
  if (sentAt) invoice.sentAt = sentAt;
  await invoice.save();
  res.json(invoice);
});

// Delete invoice by ID (admin only)
exports.remove = catchAsync(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  await invoice.deleteOne();
  res.json({ message: "Invoice deleted." });
});
