const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  // Always log the full error stack for debugging
  console.error("[ERROR]", err.stack || err);
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors || [],
    });
  }
  // Fallback for unhandled errors
  res.status(500).json({
    message: "Internal Server Error",
    errors: [],
  });
};

module.exports = errorHandler;
