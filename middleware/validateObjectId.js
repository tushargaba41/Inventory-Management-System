const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// Rejects requests where :id is not a valid MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError(`Invalid product id: ${req.params.id}`, 400));
  }
  next();
};

module.exports = validateObjectId;
