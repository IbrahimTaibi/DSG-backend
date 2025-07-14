const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors || [],
    });
  }
  // Fallback for unhandled errors
  console.error(err);
  res.status(500).json({
    message: "Internal Server Error",
    errors: [],
  });
};

module.exports = errorHandler;
