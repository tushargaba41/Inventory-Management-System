const AppError = require("../utils/AppError");

// Runs when no route matched
exports.notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// Central error handler: every error in the app ends up here
// (Express recognises it as an error handler because it has 4 arguments)
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server error";
  let details;

  // Mongoose validation failed (e.g. price < 0)
  if (err.name === "ValidationError") {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = "Validation failed";
  }

  // Bad value for a field type or an invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // Duplicate key (SKU already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value: a product with this ${field} (${err.keyValue ? err.keyValue[field] : ""}) already exists`;
  }

  // Malformed JSON in the request body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  if (statusCode === 500) {
    console.error(err);
  }

  const response = { success: false, message };
  if (details) response.errors = details;

  res.status(statusCode).json(response);
};
