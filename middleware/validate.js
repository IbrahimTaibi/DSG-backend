const Joi = require("joi");
const ApiError = require("../utils/ApiError");

// Usage: validate(schema)
module.exports = (schema) => (req, res, next) => {
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
