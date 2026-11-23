const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// Escape special regex characters so a search like "pen (blue)" doesn't break the query
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------
// POST /api/products  - create a product
// ---------------------------------------------------------------
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// ---------------------------------------------------------------
// GET /api/products  - list with filtering, sorting and pagination
//
// Query params (all optional):
//   category=Furniture        exact match (case-insensitive)
//   supplier=IKEA India       exact match (case-insensitive)
//   search=table              name contains text (case-insensitive)
//   minPrice=100&maxPrice=500 price range
//   inStock=true|false        quantity > 0  /  quantity = 0
//   sort=-price,name          comma separated; "-" means descending
//   page=1&limit=10           pagination
// ---------------------------------------------------------------
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, inStock } = req.query;

  // ----- Filtering -----
  const filter = {};

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  }
  if (supplier) {
    filter.supplier = new RegExp(`^${escapeRegex(supplier)}$`, "i");
  }
  if (search) {
    filter.name = new RegExp(escapeRegex(search), "i");
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) {
      if (isNaN(Number(minPrice))) throw new AppError("minPrice must be a number", 400);
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      if (isNaN(Number(maxPrice))) throw new AppError("maxPrice must be a number", 400);
      filter.price.$lte = Number(maxPrice);
    }
  }

  if (inStock !== undefined) {
    if (inStock === "true") filter.quantity = { $gt: 0 };
    else if (inStock === "false") filter.quantity = 0;
    else throw new AppError("inStock must be true or false", 400);
  }

  // ----- Sorting -----
  const sortableFields = ["name", "sku", "category", "price", "quantity", "createdAt", "updatedAt"];
  let sortBy = { createdAt: -1 }; // default: newest first

  if (req.query.sort) {
    sortBy = {};
    req.query.sort.split(",").forEach((item) => {
      const field = item.trim().replace(/^-/, "");
      if (!sortableFields.includes(field)) {
        throw new AppError(`Cannot sort by "${field}". Allowed: ${sortableFields.join(", ")}`, 400);
      }
      sortBy[field] = item.trim().startsWith("-") ? -1 : 1;
    });
  }

  // ----- Pagination -----
  const page = req.query.page !== undefined ? Number(req.query.page) : 1;
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError("page must be a whole number 1 or greater", 400);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError("limit must be a whole number between 1 and 100", 400);
  }

  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip(skip).limit(limit),
  ]);

  res.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

// ---------------------------------------------------------------
// GET /api/products/:id  - get one product
// ---------------------------------------------------------------
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// ---------------------------------------------------------------
// PUT /api/products/:id  - update product details (partial update allowed)
// ---------------------------------------------------------------
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // return the updated document
    runValidators: true, // apply schema validation on updates too
  });
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// ---------------------------------------------------------------
// PATCH /api/products/:id/stock  - increase or decrease stock
// Body: { "change": 10 }  restock 10 units
//       { "change": -3 }  sell 3 units
// Uses an atomic $inc so two simultaneous requests can't corrupt the count,
// and refuses to take stock below zero.
// ---------------------------------------------------------------
exports.adjustStock = asyncHandler(async (req, res) => {
  const { change } = req.body;

  if (typeof change !== "number" || !Number.isInteger(change) || change === 0) {
    throw new AppError('"change" must be a non-zero whole number (e.g. 10 or -3)', 400);
  }

  // For a sale (negative change) only match if enough stock exists
  const filter = { _id: req.params.id };
  if (change < 0) {
    filter.quantity = { $gte: -change };
  }

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { new: true }
  );

  if (!product) {
    // Work out whether the product is missing or stock was too low
    const existing = await Product.findById(req.params.id);
    if (!existing) throw new AppError("Product not found", 404);
    throw new AppError(
      `Insufficient stock: only ${existing.quantity} unit(s) available, cannot remove ${-change}`,
      400
    );
  }

  res.json({ message: "Stock updated", product });
});

// ---------------------------------------------------------------
// DELETE /api/products/:id
// ---------------------------------------------------------------
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  res.json({ message: "Product deleted", id: product.id });
});

// ---------------------------------------------------------------
// GET /api/products/low-stock  - products at or below their reorder level
// (aggregation pipeline)
// ---------------------------------------------------------------
exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.aggregate([
    // quantity <= reorderLevel (compares two fields of the same document)
    { $match: { $expr: { $lte: ["$quantity", "$reorderLevel"] } } },
    {
      $addFields: {
        stockValue: { $multiply: ["$price", "$quantity"] },
        shortBy: { $subtract: ["$reorderLevel", "$quantity"] },
      },
    },
    { $sort: { quantity: 1 } }, // most urgent (lowest stock) first
  ]);

  res.json({ count: lowStockItems.length, lowStockItems });
});

// ---------------------------------------------------------------
// GET /api/products/summary  - category-wise inventory summary
// (aggregation pipeline with $group)
// ---------------------------------------------------------------
exports.getCategorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        avgPrice: { $avg: "$price" },
      },
    },
    {
      $project: {
        totalItems: 1,
        totalQuantity: 1,
        totalStockValue: 1,
        avgPrice: { $round: ["$avgPrice", 2] },
      },
    },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.json({ categories: summary.length, summary });
});
