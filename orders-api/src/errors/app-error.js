export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} httpStatus
   * @param {string} code
   * @param {any}    details
   */
  constructor(
    message,
    httpStatus = 500,
    code = "APP_ERROR",
    details = null,
    cause
  ) {
    super(message);
    this.name = "AppError";
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
    if (cause) this.cause = cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
  toJSON() {
    return { message: this.message, code: this.code, details: this.details };
  }

  // Genéricos
  static badRequest(msg = "Bad Request", code = "BAD_REQUEST", d) {
    return new AppError(msg, 400, code, d);
  }
  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED", d) {
    return new AppError(msg, 401, code, d);
  }
  static forbidden(msg = "Forbidden", code = "FORBIDDEN", d) {
    return new AppError(msg, 403, code, d);
  }
  static notFound(msg = "Not Found", code = "NOT_FOUND", d) {
    return new AppError(msg, 404, code, d);
  }
  static conflict(msg = "Conflict", code = "CONFLICT", d) {
    return new AppError(msg, 409, code, d);
  }
  static unprocessable(msg = "Validation error", code = "UNPROCESSABLE", d) {
    return new AppError(msg, 422, code, d);
  }
  static unavailable(msg = "Service unavailable", code = "UNAVAILABLE", d) {
    return new AppError(msg, 503, code, d);
  }

  // Específicos de oders
  static customerNotFound(id) {
    return this.notFound("Customer not found", "CUSTOMER_NOT_FOUND", { id });
  }
  static outOfStock(productId) {
    return this.conflict("Insufficient stock", "OUT_OF_STOCK", { productId });
  }
  static alreadyConfirmed(id) {
    return this.conflict("Order already confirmed", "ALREADY_CONFIRMED", {
      id,
    });
  }
  static missingIdempotencyKey() {
    return this.badRequest(
      "Missing X-Idempotency-Key",
      "MISSING_IDEMPOTENCY_KEY"
    );
  }
  static invalidStatusTransition(from, to) {
    return this.conflict("Invalid status transition", "INVALID_STATUS", {
      from,
      to,
    });
  }
}
