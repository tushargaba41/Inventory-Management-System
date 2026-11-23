// A small custom error that carries an HTTP status code.
// Throw it anywhere and the central error handler turns it into a JSON response.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
