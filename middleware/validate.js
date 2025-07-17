const Joi = require("joi");
const ApiError = require("../utils/ApiError");

// Usage: validate(schema)
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    console.error(
      "Validation error:",
      error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
    );
    return res.status(400).json({
      message: "Validation error",
      errors: error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
    });
  }
  next();
};

const validateReturnRequest = (req, res, next) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res
      .status(400)
      .json({ message: "Products array is required for partial return." });
  }
  for (const item of products) {
    if (
      !item.product ||
      typeof item.quantity !== "number" ||
      item.quantity < 1
    ) {
      return res.status(400).json({
        message: "Each product must have a valid product id and quantity > 0.",
      });
    }
  }
  next();
};

const validateReturnStatusTransition = (req, res, next) => {
  const allowedTransitions = {
    requested: ["approved", "rejected", "cancelled"],
    approved: ["in_transit", "cancelled"],
    in_transit: ["received", "cancelled"],
    received: ["completed"],
    completed: [],
    rejected: [],
    cancelled: [],
  };
  const currentStatus = req.return.status;
  const { status } = req.body;
  if (!status || !allowedTransitions[currentStatus].includes(status)) {
    return res.status(400).json({
      message: `Cannot change status from ${currentStatus} to ${status}`,
    });
  }
  // Only admin can approve, reject, or mark as completed
  if (
    ["approved", "rejected", "completed"].includes(status) &&
    req.user.role !== "admin"
  ) {
    return res
      .status(403)
      .json({ message: "Only admin can perform this status change." });
  }
  // Only store can cancel their own requested return
  if (
    status === "cancelled" &&
    req.user.role !== "admin" &&
    req.user.role !== "store"
  ) {
    return res
      .status(403)
      .json({ message: "Only admin or store can cancel a return." });
  }
  next();
};

module.exports = {
  validate,
  validateReturnRequest,
  validateReturnStatusTransition,
};
