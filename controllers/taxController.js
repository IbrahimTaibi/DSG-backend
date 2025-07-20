const Tax = require("../models/tax");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

// Create tax
exports.create = catchAsync(async (req, res) => {
  const { name, rate, code, description, active, type } = req.body;
  if (!name || typeof rate !== "number" || !code) {
    throw new ApiError(400, "Name, rate, and code are required.");
  }
  const exists = await Tax.findOne({ code });
  if (exists) throw new ApiError(409, "Tax code already exists.");
  const tax = new Tax({ name, rate, code, description, active, type });
  await tax.save();
  res.status(201).json(tax);
});

// Get all taxes
exports.getAll = catchAsync(async (req, res) => {
  const taxes = await Tax.find();
  res.json(taxes);
});

// Get tax by ID
exports.getById = catchAsync(async (req, res) => {
  const tax = await Tax.findById(req.params.id);
  if (!tax) throw new ApiError(404, "Tax not found.");
  res.json(tax);
});

// Update tax
exports.update = catchAsync(async (req, res) => {
  const tax = await Tax.findById(req.params.id);
  if (!tax) throw new ApiError(404, "Tax not found.");
  const { name, rate, code, description, active, type } = req.body;
  if (name) tax.name = name;
  if (typeof rate === "number") tax.rate = rate;
  if (code) tax.code = code;
  if (typeof active === "boolean") tax.active = active;
  if (description) tax.description = description;
  if (type) tax.type = type;
  await tax.save();
  res.json(tax);
});

// Delete tax
exports.remove = catchAsync(async (req, res) => {
  const tax = await Tax.findById(req.params.id);
  if (!tax) throw new ApiError(404, "Tax not found.");
  await tax.deleteOne();
  res.json({ message: "Tax deleted." });
});
