export function errorHandler(err, _req, res, _next) {
  const status = err.httpStatus ?? 500;
  res.status(status).json({ message: err.message ?? "Internal Error" });
}
