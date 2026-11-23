const AppError = require("../utils/AppError");

const ALLOWED_FIELDS = [
  "name",
  "sku",
  "category",
  "price",
  "quantity",
  "reorderLevel",
  "supplier",
];
const REQUIRED_FIELDS = ["name", "sku", "category", "price", "quantity"];

// Checks the request body before it reaches the controller.
// isUpdate = true  -> every field is optional (partial update), but at least one must be present.
// isUpdate = false -> all REQUIRED_FIELDS must be present (create).
const buildValidator = (isUpdate) => (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(new AppError("Request body must be a JSON object", 400));
  }

  const errors = [];

  // Reject fields we don't know about (also stops people setting _id, createdAt, etc.)
  Object.keys(body).forEach((key) => {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  });

  if (isUpdate && Object.keys(body).length === 0) {
    errors.push("Provide at least one field to update");
  }

  if (!isUpdate) {
    REQUIRED_FIELDS.forEach((field) => {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        errors.push(`${field} is required`);
      }
    });
  }

  // Type checks (only for fields that were sent)
  ["name", "sku", "category", "supplier"].forEach((field) => {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      errors.push(`${field} must be a string`);
    }
  });

  ["price", "quantity", "reorderLevel"].forEach((field) => {
    if (body[field] !== undefined && typeof body[field] !== "number") {
      errors.push(`${field} must be a number`);
    }
  });

  if (errors.length > 0) {
    return next(new AppError(errors.join("; "), 400));
  }

  next();
};

exports.validateCreate = buildValidator(false);
exports.validateUpdate = buildValidator(true);
