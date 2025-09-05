export function authInternal(req, res, next) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1];

  if (!token) return res.status(401).json({ message: "Missing bearer token" });
  if (token !== process.env.SERVICE_TOKEN)
    return res.status(403).json({ message: "Invalid token" });

  next();
}
