import jwt from "jsonwebtoken";

export function auth(requiredRole) {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || "";
      const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Missing token" });

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      // payload: { sub, code, role, iat, exp }
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = payload; // attach to request
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

