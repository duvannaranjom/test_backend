export class AppError extends Error {
  /**
   * @param {string} message - Descripción del error
   * @param {number} httpStatus - Código HTTP (ej. 400, 401, 404, 409, 422, 500)
   * @param {string} code - Código de negocio (ej. 'EMAIL_CONFLICT')
   * @param {any} details - Datos extra (opcional)
   * @param {Error} cause - Error original (opcional)
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

  static badRequest(msg = "Bad Request", code = "BAD_REQUEST", details) {
    return new AppError(msg, 400, code, details);
  }
  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED", details) {
    return new AppError(msg, 401, code, details);
  }
  static notFound(msg = "Not Found", code = "NOT_FOUND", details) {
    return new AppError(msg, 404, code, details);
  }
  static conflict(msg = "Conflict", code = "CONFLICT", details) {
    return new AppError(msg, 409, code, details);
  }
}
