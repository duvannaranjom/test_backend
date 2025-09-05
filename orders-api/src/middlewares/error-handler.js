import { AppError } from "../errors/app-error.js";

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.httpStatus ?? 500).json(err.toJSON());
  }

  if (err?.name === "ZodError") {
    return res
      .status(422)
      .json({ message: "Validation error", issues: err.issues });
  }

  switch (err?.code) {
    case "ER_DUP_ENTRY":
      return res.status(409).json({ message: "Duplicate entry" });
    case "ER_NO_REFERENCED_ROW_2":
    case "ER_ROW_IS_REFERENCED_2":
      return res.status(409).json({ message: "Foreign key constraint" });
    case "ER_LOCK_DEADLOCK":
      return res.status(409).json({ message: "Deadlock, retry the request" });
    case "PROTOCOL_CONNECTION_LOST":
    case "ECONNREFUSED":
    case "ETIMEDOUT":
    case "EPIPE":
      return res.status(503).json({ message: "Database unavailable" });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal Error" });
}

export function notFound(_req, res) {
  res.status(404).json({ message: "Not found" });
}
