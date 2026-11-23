// Express 4 does not catch errors thrown inside async functions.
// This wrapper forwards them to the central error handler so we don't need try/catch everywhere.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
