export const errorHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error.code === "23505") {
    return res.status(409).json({ message: "A record with these values already exists." });
  }

  if (error.code === "23503") {
    return res.status(409).json({ message: "Record is still referenced by another entity." });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const body = { message };

  if (error.details) {
    body.details = error.details;
  }

  return res.status(statusCode).json(body);
};
